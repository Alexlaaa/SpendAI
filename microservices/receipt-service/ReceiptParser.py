from abc import ABC, abstractmethod

class AbstractParser(ABC):
    def __init__(self, api_key: str, receipt_schema, model_name: str, max_retry: int = 4, buffer: int = 2048):
        self.api_key = api_key
        # Default = 4, 3 retries + 1 initial
        self.max_retry = max_retry
        self.buffer = buffer
        self.receipt_schema = receipt_schema
        self.model_name = model_name
        self.initial_prompt = """Given an image of a receipt, extract information from the receipt. If the image is not a receipt, please return Invalid category and ignore all other fields.
If the values are not present, please return 'None' for them.

merchant_name: The name of the merchant
total_cost: The total cost of the receipt
category: The category of spending (Transport, Clothing, Healthcare, Food, Leisure, Housing, Others, Invalid). Only return Invalid if the image is not a receipt.
date: The date of the receipt
itemized_list: A list of line items, each containing:
    item_name: The name of the item
    item_cost: REQUIRED - The cost of the item (e.g., '10.99'). If the price is not explicitly stated, estimate based on the item and total cost.
    item_quantity: The quantity of the item as a whole number integer (like 1, 2, 3)
""".strip()
        self.system_instruction = """You are an AI language model tasked with extracting key information from a receipt.
If the image given is not a receipt, please return Invalid category and ignore all other fields. If the values are not present, please return 'None' for them.
Always use simple formats for numbers - use whole integers for quantities (like 1, 2, 3) and avoid long decimal values.
IMPORTANT: Each item in the itemized_list MUST include item_name, item_cost, and item_quantity. For item_cost, if the exact price is not visible, make a reasonable estimate based on the total cost.""".strip()

    @abstractmethod
    def parse(self, receipt_obj_list):
        pass

    @abstractmethod
    def get_token_count(self, prompt):
        pass
