from openai import OpenAI
from pydantic import BaseModel
from typing import Optional
from Receipt import Receipt, ReceiptError, Category
from Exceptions import APIKeyError
import json
import tiktoken
import base64
from io import BytesIO
from openai import AuthenticationError
from ReceiptParser import AbstractParser
from ReceiptReview import AbstractReview

class OpenAIReceiptParser(AbstractParser):
    def __init__(self, api_key, model_version: str = 'gpt-4o-mini'):
        # Response schema
        class LineItemSchema(BaseModel):
            item_name: str
            item_quantity: str
            item_cost: str

        class ReceiptResponseSchema(BaseModel):
            merchant_name: str
            total_cost: str
            category: Category
            date: str
            itemized_list: Optional[list[LineItemSchema]]
        super().__init__(api_key=api_key, receipt_schema=ReceiptResponseSchema, model_name=model_version)
        self.client = OpenAI(api_key=self.api_key, max_retries=2, timeout=60.0)
        # Chat session specific attributes
        self.messages = []

        # Generation config
        self.generation_config = {
            'n': 1,  # number of candidates to generate, only need 1
            'max_tokens': self.buffer, # max number of tokens to generate
            'temperature': 0.1, # Low temperature to because OCR is deterministic
            'top_p': 0.1, # Low top_p to because OCR is deterministic
            'response_format': self.receipt_schema, # Define the schema of the response
        }

    def parse(self, img_list):
        # Convert to base64 first
        img_b64_list = []
        for img in img_list:
            img_b64_list.append(self.encode_img(img))

        # Add system instruction
        self.append_message("system", self.system_instruction)
        # Combine user prompt and image
        combined_prompt = [
            {"type": "text", "text": self.initial_prompt},
            *[{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}", "detail": "high"}} for img_b64 in img_b64_list]
        ]
        # Add user request and image
        self.append_message("user", combined_prompt)

        for attempt_num in range(self.max_retry):
            # Send the request
            try:
                response = self.client.beta.chat.completions.parse(
                    model=self.model_name,
                    messages=self.messages,
                    **self.generation_config
                )
            except AuthenticationError:
                # Exit out to receipt service
                raise APIKeyError()

            # Append response to messages
            response_content = response.choices[0].message.content
            self.append_message("assistant", response_content)

            try:
                # Parse json response
                receipt_dict = json.loads(response_content)

                # If model returns invalid category, return None
                if receipt_dict['category'] == Category.INVALID.value:
                    print("Image is not a receipt.")
                    return None

                receipt_instance = Receipt(**receipt_dict)
                print(f"Attempt {attempt_num + 1} Success")
                return receipt_instance
            except ReceiptError as e:
                print(f"Attempt {attempt_num + 1} Error: {e}")

                # If max retry reached or token limit reached, return None
                if (attempt_num + 1 == self.max_retry or
                        response.usage.total_tokens + self.get_token_count(str(e)) +
                        self.buffer > self.get_token_limit(self.model_name)):
                    print("Max retry reached. Unable to parse receipt.")
                    return None

                # Continue the conversation, highlighting the error
                self.append_message("user", str(e))

        return None

    @staticmethod
    def get_token_limit(model_version: str) -> int:
        # Only include vision models
        mapper_dict = {
            'gpt-4o-mini': 128000,
            'gpt-4o': 128000,
            'gpt-4-turbo': 128000,
        }
        return mapper_dict[model_version]

    def get_token_count(self, prompt: str) -> int:
        encoding = tiktoken.encoding_for_model(self.model_name)
        num_tokens = len(encoding.encode(prompt))
        return num_tokens

    def append_message(self, role, content):
        if role not in ["user", "system", "assistant"]:
            raise ValueError("Role must be one of 'user', 'system', or 'assistant'")

        self.messages.append({"role": role, "content": content})

    @staticmethod
    def encode_img(img):
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        buffer.seek(0)
        image_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return image_b64


class OpenAIReceiptReview(AbstractReview):
    def __init__(self, api_key, model_version: str = 'gpt-4o-mini'):
        # Response schema
        class ReceiptReviewSchema(BaseModel):
            status: bool
            insights: str

        super().__init__(api_key=api_key, review_schema=ReceiptReviewSchema, model_name=model_version)
        self.client = OpenAI(api_key=self.api_key, max_retries=2, timeout=60.0)
        # Chat session specific attributes
        self.messages = []

        # Generation config
        self.generation_config = {
            'n': 1,  # number of candidates to generate, only need 1
            'max_tokens': self.buffer, # max number of tokens to generate
            'temperature': 1.0,
            'top_p': 1.0,
            'response_format': self.review_schema, # Define the schema of the response
        }

    def review(self, receipt_str, query):
        # Add system instruction
        self.append_message("system", self.system_instruction)
        # Combine user prompt and image
        combined_prompt = [
            {"type": "text", "text": self.initial_prompt},
            {"type": "text", "text": receipt_str},
            {"type": "text", "text": query}
        ]
        # Add user request and their spending data
        self.append_message("user", combined_prompt)

        for attempt_num in range(self.max_retry):
            # Send the request
            try:
                response = self.client.beta.chat.completions.parse(
                    model=self.model_name,
                    messages=self.messages,
                    **self.generation_config
                )
            except AuthenticationError:
                # Exit out to receipt service
                raise APIKeyError()

            # Append response to messages
            response_content = response.choices[0].message.content
            self.append_message("assistant", response_content)

            # Parse json response
            review_dict = json.loads(response_content)

            if not review_dict['status']:
                print(f"Attempt {attempt_num + 1} Error: status is False")
                if (attempt_num + 1 == self.max_retry or
                        response.usage.total_tokens + self.get_token_count(self.error_response) +
                        self.buffer > self.get_token_limit(self.model_name)):
                    print("Max retry reached. Unable to generate insights.")
                    return None

                self.append_message("user", self.error_response)
            else:
                print(f"Attempt {attempt_num + 1} Success")
                return review_dict["insights"]

        return None

    @staticmethod
    def get_token_limit(model_version: str) -> int:
        # Only include vision models
        mapper_dict = {
            'gpt-4o-mini': 128000,
            'gpt-4o': 128000,
            'gpt-4-turbo': 128000,
        }
        return mapper_dict[model_version]

    def get_token_count(self, prompt: str) -> int:
        encoding = tiktoken.encoding_for_model(self.model_name)
        num_tokens = len(encoding.encode(prompt))
        return num_tokens

    def append_message(self, role, content):
        if role not in ["user", "system", "assistant"]:
            raise ValueError("Role must be one of 'user', 'system', or 'assistant'")

        self.messages.append({"role": role, "content": content})
