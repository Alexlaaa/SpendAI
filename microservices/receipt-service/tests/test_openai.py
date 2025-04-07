import os
from dotenv import load_dotenv
load_dotenv()


def test_receipt_images(app_client, receipt_images, receipt_image_ans, subtests):
    for image_name, file_to_test in receipt_images.items():
        with subtests.test(msg=f"Evaluating image: {image_name}"):
            data = {
                'file': (file_to_test.stream, file_to_test.filename, file_to_test.content_type),
                'defaultModel': 'OPENAI',
                'openaiKey': os.getenv('openaiKey'),
                'geminiKey': 'UNSET'
            }

            response = app_client.post(
                '/upload',
                data=data
            )

            assert response.status_code == 200

            for field, expected_value in receipt_image_ans[image_name].items():
                actual_value = response.json.get(field)
                assert expected_value.lower().strip() == actual_value.lower().strip() or (expected_value in actual_value or actual_value in expected_value), f"Mismatch in field '{field}' for image '{image_name}'"



def test_non_receipt_images(app_client, non_receipt_images, subtests):
    for image_name, file_to_test in non_receipt_images.items():
        with subtests.test(msg=f"Evaluating image: {image_name}"):
            data = {
                'file': (file_to_test.stream, file_to_test.filename, file_to_test.content_type),
                'defaultModel': 'OPENAI',
                'openaiKey': os.getenv('openaiKey'),
                'geminiKey': 'UNSET'
            }

            response = app_client.post(
                '/upload',
                data=data
            )

            assert response.status_code == 400
            assert response.json.get('error') == "Image is not a receipt or error parsing receipt"


def test_receipt_review(app_client):
    raw_data = {
        "apiKeys": {
            "defaultModel": "openai",
            "geminiKey": "UNSET",
            "openaiKey": f"{os.getenv('openaiKey')}"
        },
    "receipts": [
            {
                "id": "61e6f0a1c8a4f93b1c1e1f1a",
                "merchantName": "Supermarket A",
                "date": "2023-10-20T12:34:56.789Z",
                "totalCost": 54.99,
                "category": "Groceries",
                "itemizedList": [
                    {
                        "itemName": "Milk",
                        "itemQuantity": 2,
                        "itemCost": 3.5
                    },
                    {
                        "itemName": "Bread",
                        "itemQuantity": 1,
                        "itemCost": 2.0
                    }
                ]
            }
        ],
        "query": "What can I do to reduce my spendings? I live in Singapore. Any singapore tips?"
    }

    # Send post request
    response = app_client.post(
        '/review',
        json=raw_data,
        headers={'Content-Type': 'application/json'}
    )

    # Assert response
    assert response.status_code == 200
    assert isinstance(response.json, str)
    assert len(response.json) > 10


