from abc import ABC, abstractmethod

class AbstractReview(ABC):
    def __init__(self, api_key: str, review_schema, model_name: str, max_retry: int = 4, buffer: int = 2048):
        self.api_key = api_key
        # Default = 4, 3 retries + 1 initial
        self.max_retry = max_retry
        self.buffer = buffer
        self.review_schema = review_schema
        self.model_name = model_name
        self.initial_prompt = """Given the spending data of a user, generate useful insights to help the user understand their spending pattern and reduce their spendings.

The receipts data are formatted as:
    merchant_name: The name of the merchant
    total_cost: The total cost of the receipt
    category: The category of spending (Transport, Clothing, Healthcare, Food, Leisure, Housing, Others, Invalid). Only return Invalid if the image is not a receipt.
    date: The date of the receipt
    itemized_list: A list of line items, each containing:
        item_name: The name of the item
        item_cost: The cost of the item
        item_quantity: The quantity of the item
        
The insights response must be formatted as:
    status: If insights are generated (True, False).
    insights: if status is True, return string containing the insights generated from the spending data. If status is False, return 'None'.
    
Please always give some insights, even if the data is not enough to generate a meaningful insight. General insights are also acceptable.
Please do not mention about lack of spending data, General insights are also acceptable.
""".strip()
        self.system_instruction = """You are an AI language model tasked with generating insights given the spending data of the user.
Please always give some insights, even if the data is not enough to generate a meaningful insight. General insights are also acceptable.
Please do not mention about lack of spending data, General insights are also acceptable.""".strip()
        self.error_response = """Missing insight in response. Please always give some insights, even if the data is not enough to generate a meaningful insight. General insights are also acceptable.""".strip()

    @abstractmethod
    def review(self, receipt_str, query):
        pass