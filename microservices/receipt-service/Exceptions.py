class ReceiptError(Exception):
    """To format an error message to reply to LLM"""
    def __init__(self, field_name_with_error: str, error_msg: str):
        self.field_name = field_name_with_error
        self.error_msg = error_msg
        super().__init__(f"Input error for field: {self.field_name}. {self.error_msg}")

class APIKeyError(Exception):
    """Invalid API key"""
    def __init__(self):
        # No message needed
        super().__init__()