def test_missing_model_param(app_client):
    raw_data = {
        "apiKeys": {
            # "defaultModel": "gemini",
            "geminiKey": "TESTKEY1",
            "openaiKey": "TESTKEY2"
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
    assert response.status_code == 400
    assert response.json == {'error': 'Missing defaultModel parameter'}

def test_missing_api_key_param(app_client):
    raw_data = {
        "apiKeys": {
            "defaultModel": "gemini",
            # "geminiKey": "TESTKEY1",
            # "openaiKey": "TESTKEY2"
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
    assert response.status_code == 400
    assert response.json == {'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}

def test_missing_receipts_param(app_client):
    raw_data = {
        "apiKeys": {
            "defaultModel": "gemini",
            "geminiKey": "TESTKEY1",
            "openaiKey": "TESTKEY2"
        },
        "query": "What can I do to reduce my spendings? I live in Singapore. Any singapore tips?"
    }

    # Send post request
    response = app_client.post(
        '/review',
        json=raw_data,
        headers={'Content-Type': 'application/json'}
    )

    # Assert response
    assert response.status_code == 400
    assert response.json == {'error': 'Missing receipts parameter'}