# from werkzeug.datastructures import FileStorage
# import typing_extensions
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import json
from Receipt import Receipt, ReceiptError, Category
from Exceptions import APIKeyError
from google.api_core.exceptions import InvalidArgument
from ReceiptParser import AbstractParser
from ReceiptReview import AbstractReview


# Define the template of the return json obj
# Method 1
# Does not seem to work well, inconsistent results
# class LineItemSchema(typing_extensions.TypedDict):
#     item_name: str
#     item_quantity: int
#     item_cost: str
#
# class ReceiptResponseSchema(typing_extensions.TypedDict):
#     merchant_name: str
#     total_cost: str
#     category: str
#     date: str
#     itemized_list: list[LineItemSchema]


class GeminiReceiptParser(AbstractParser):
    def __init__(self, api_key: str, model_version: str = 'models/gemini-1.5-flash'):
        # Method 2
        receipt_schema = genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                'merchant_name': genai.protos.Schema(type=genai.protos.Type.STRING),
                'date': genai.protos.Schema(type=genai.protos.Type.STRING),
                'total_cost': genai.protos.Schema(type=genai.protos.Type.STRING),
                'category': genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    enum=[category.value for category in Category]
                ),
                'itemized_list': genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    items=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            'item_name': genai.protos.Schema(type=genai.protos.Type.STRING),
                            'item_cost': genai.protos.Schema(type=genai.protos.Type.STRING, description="Required. The cost of the item in decimal format (e.g., '10.99')"),
                            'item_quantity': genai.protos.Schema(type=genai.protos.Type.INTEGER),
                        },
                        required=['item_name', 'item_cost', 'item_quantity']
                    )
                )
            },
            required=['merchant_name', 'date', 'total_cost', 'category', 'itemized_list']
        )
        # Call the parent class constructor
        super().__init__(api_key=api_key, receipt_schema=receipt_schema, model_name=model_version)
        # Configure the API key
        genai.configure(api_key=self.api_key)
        # Setup model config
        # Chat instance attributes
        self.response = None

        # Generation config
        self.generation_config = genai.types.GenerationConfig(
                candidate_count=1, # Only need 1 candidate
                stop_sequences=None, # Dont need to control model to stop
                max_output_tokens=self.buffer, # max number of tokens to generate, should be same as buffer
                temperature=0.1, # Low temperature to because OCR is deterministic task
                top_p=0.1, # Low top_p to because OCR is deterministic task
                top_k=1, # Greedy decoding because OCR is deterministic task
                response_mime_type="application/json", # Output in json
                response_schema=self.receipt_schema, # Also follow json schema
        )
        # Turn off safety settings to ensure explicit shop names or line items can be parsed
        self.safety_settings = {
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        # Init the model
        self.model = genai.GenerativeModel(model_name=self.model_name, system_instruction=self.system_instruction,
                                           generation_config=self.generation_config, safety_settings=self.safety_settings)
        try:
            self.model_info = genai.get_model(self.model_name)
        except InvalidArgument as e:
            if e.code == 400 and "API key not valid" in str(e):
                raise APIKeyError()

        # Init chat instance
        self.chat_instance = self.model.start_chat(history=[], enable_automatic_function_calling=False)

    def get_token_count(self, prompt):
            return int(self.model.count_tokens(prompt).total_tokens)

    def parse(self, receipt_obj_list):
        messages = [[self.initial_prompt, *receipt_obj_list]]

        for attempt_num in range(self.max_retry):
            # Generate the receipt
            print(messages[-1])
            self.response = self.chat_instance.send_message(messages[-1],
                                                       generation_config=self.generation_config,
                                                       safety_settings=self.safety_settings)

            # Attempt to parse the receipt
            try:
                # Log the raw response text before attempting to parse
                print(f"Raw Gemini Response Text (Attempt {attempt_num + 1}): {self.response.text}")
                receipt_dict = json.loads(self.response.text)

                # If model returns None for all fields, return None
                if receipt_dict['category'] == Category.INVALID.value:
                    print("Image is not a receipt.")
                    return None

                receipt_instance = Receipt(**receipt_dict)
                print(f"Attempt {attempt_num + 1} Success")

                return receipt_instance
            # Catch both ReceiptError and JSONDecodeError
            except (ReceiptError, json.JSONDecodeError) as e:
                print(f"Attempt {attempt_num + 1} Error during parsing: {e}")
                # Log the raw text if it was a JSONDecodeError
                if isinstance(e, json.JSONDecodeError):
                    print(f"Failed to parse JSON: {self.response.text}")

                # If max retry reached or token limit reached, return None
                if (attempt_num + 1 == self.max_retry or
                        self.response.usage_metadata.total_token_count +
                        self.get_token_count(str(e)) + self.buffer >
                        self.model_info.input_token_limit):
                    print("Max retry reached or token limit exceeded. Unable to parse receipt.")
                    return None

                # Still have retries left, retry
                # Provide feedback to the model about the error
                error_feedback = f"Parsing failed with error: {e}. Please check the JSON format and try again."
                messages.append([error_feedback])
                continue

        return None


class GeminiReceiptReview(AbstractReview):
    def __init__(self, api_key: str, model_version: str = 'models/gemini-1.5-flash'):
        # Method 2
        review_schema = genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                'status': genai.protos.Schema(type=genai.protos.Type.BOOLEAN),
                'insights': genai.protos.Schema(type=genai.protos.Type.STRING),
            },
            required=['status', 'insights']
        )
        # Call the parent class constructor
        super().__init__(api_key=api_key, review_schema=review_schema, model_name=model_version)
        # Configure the API key
        genai.configure(api_key=self.api_key)
        # Setup model config
        # Chat instance attributes
        self.response = None

        # Generation config
        self.generation_config = genai.types.GenerationConfig(
            candidate_count=1,  # Only need 1 candidate
            stop_sequences=None,  # Dont need to control model to stop
            max_output_tokens=self.buffer,  # max number of tokens to generate, should be same as buffer
            temperature=1.0,
            top_p=1.0,
            top_k=50,
            response_mime_type="application/json",  # Output in json
            response_schema=self.review_schema,  # Also follow json schema
        )
        # Turn off safety settings to ensure explicit shop names or line items can be parsed
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        # Init the model
        self.model = genai.GenerativeModel(model_name=self.model_name, system_instruction=self.system_instruction,
                                           generation_config=self.generation_config,
                                           safety_settings=self.safety_settings)
        try:
            self.model_info = genai.get_model(self.model_name)
        except InvalidArgument as e:
            if e.code == 400 and "API key not valid" in str(e):
                raise APIKeyError()

        # Init chat instance
        self.chat_instance = self.model.start_chat(history=[], enable_automatic_function_calling=False)

    def chat_with_prompt(self, prompt: str):
        """
        Sends a pre-formatted prompt directly to the LLM and returns the text response.
        Uses a simpler generation config without a response schema.
        """
        # Use a generation config without the JSON response schema for freeform chat
        chat_generation_config = genai.types.GenerationConfig(
            candidate_count=1,
            stop_sequences=None,
            max_output_tokens=self.buffer,
            temperature=0.7, # Adjust temperature for chat if needed
            top_p=1.0,
            top_k=50,
            # No response_mime_type or response_schema here
        )
        messages = [[prompt]] # Send the prompt directly

        for attempt_num in range(self.max_retry):
            print(f"Attempting chat_with_prompt (Attempt {attempt_num + 1})")
            try:
                self.response = self.chat_instance.send_message(
                    messages[-1],
                    generation_config=chat_generation_config, # Use chat-specific config
                    safety_settings=self.safety_settings
                )
                # Return the raw text response
                print(f"Chat attempt {attempt_num + 1} success.")
                return self.response.text
            except Exception as e:
                print(f"Chat attempt {attempt_num + 1} Error: {e}")
                # If max retry reached or token limit issue (simplified check)
                if attempt_num + 1 == self.max_retry:
                     print("Max retry reached for chat_with_prompt.")
                     return None
                continue
        return None # Should not be reached if retries are handled, but as a fallback

    def review(self, receipt_str, query):
        # This method remains for the original /review endpoint functionality
        messages = [[self.initial_prompt, receipt_str, query]]

        for attempt_num in range(self.max_retry):
            # Generate the receipt
            print(messages[-1])
            self.response = self.chat_instance.send_message(messages[-1],
                                                       generation_config=self.generation_config,
                                                       safety_settings=self.safety_settings)

            # Attempt to parse review response
            review_dict = json.loads(self.response.text)

            # If model unable to generate review
            if not review_dict['status']:
                if (attempt_num + 1 == self.max_retry or
                        self.response.usage_metadata.total_token_count +
                        self.get_token_count(self.error_response) + self.buffer >
                        self.model_info.input_token_limit):
                    return None
                # Still have retries left, retry
                messages.append(self.error_response)
                continue
            else:
                print(f"Attempt {attempt_num + 1} Success")
                return review_dict['insights']
        return None

    def get_token_count(self, prompt):
            return int(self.model.count_tokens(prompt).total_tokens)
