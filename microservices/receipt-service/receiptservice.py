from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from gemini import GeminiReceiptParser, GeminiReceiptReview
from Receipt import ReceiptEncoder
from Exceptions import APIKeyError
from gpt4o import OpenAIReceiptParser, OpenAIReceiptReview
from flask import Response
from pdf2image import convert_from_bytes
import json
import PIL.Image

def create_app():
    app = Flask(__name__)
    app.json_encoder = ReceiptEncoder
    CORS(app, resources={r"/*": {"origins": "*"}})

    VALID_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

    def allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in VALID_IMAGE_EXTENSIONS

    @app.route('/review', methods=['POST'])
    def get_review():
        data = request.json

        default_model = data.get('apiKeys', {}).get('defaultModel')
        gemini_api_key = data.get('apiKeys', {}).get('geminiKey')
        openai_api_key = data.get('apiKeys', {}).get('openaiKey')
        receipts = data.get('receipts')
        query = data.get('query')

        if query is None:
            query = ""

        # Check if everything is received
        if not default_model:
            return jsonify({'error': 'Missing defaultModel parameter'}), 400

        if (gemini_api_key in [None, 'UNSET']) and (openai_api_key in [None, 'UNSET']):
            return jsonify({'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}), 400

        if receipts is None:
            return jsonify({'error': 'Missing receipts parameter'}), 400

        # Format list of receipts to string
        receipt_str = ""
        for receipt in receipts:
            receipt_str += f"Merchant: {receipt['merchantName']}\n"
            receipt_str += f"Date: {receipt['date']}\n"
            receipt_str += f"Category: {receipt['category']}\n"
            receipt_str += f"Total Cost: {receipt['totalCost']}\n"
            receipt_str += "Itemized List:\n"
            for item in receipt['itemizedList']:
                receipt_str += f"  - {item['itemName']}: {item['itemQuantity']} x ${item['itemCost']}\n"
            receipt_str += "\n"  # Add an extra newline to separate receipts
        receipt_str = receipt_str.rstrip()

        # Get insights for spending pattern
        # Receipts is a list of dicts
        reviewers = [
            ('GEMINI', GeminiReceiptReview, gemini_api_key),
            ('OPENAI', OpenAIReceiptReview, openai_api_key),
            # Additional reviewers can be added here
        ]
        # Make sure the default_model parser is the first in the list
        reviewers.sort(key=lambda x: x[0] != default_model.upper())

        response = None
        api_key_error_models = []
        # Try each parser in order, default_model first, then the rest
        for model_name, parser_cls, api_key in reviewers:
            if api_key == 'UNSET':
                print(f'Skipping {model_name} reviewer, {model_name} API key is not set')
                continue
            try:
                print(f'Reviewing with {model_name} reviewer')
                # Init the parser
                receipt_reviewer = parser_cls(api_key)
                # Parse the receipt
                response = receipt_reviewer.review(receipt_str, query)

                # If response is not None, we successfully generated insights to the receipt
                if response is not None:
                    break
            except APIKeyError:
                api_key_error_models.append(model_name)
                if model_name == reviewers[-1][0]:
                    return jsonify({'error': f"Invalid API keys for {api_key_error_models}"}), 401
            except Exception as e:
                print(f"Unexpected error occurred while reviewing with {model_name}: {e}")
                continue

        # After all parsers have been tried, if response is still None, return an error
        if response is None:
            # Return standard insights
            return jsonify("""Track your spending diligently to identify unnecessary expenses, prioritize needs over wants, and create a realistic budget.
Cut costs by meal planning, reducing utility usage, and canceling unused subscriptions.
Pay down high-interest debt aggressively while exploring cheaper alternatives for insurance, transportation, and entertainment.""".strip()), 200

        # Use ReceiptEncoder explicitly because some error with pytest not using
        print(response)
        return jsonify(response), 200


    @app.route('/upload', methods=['POST'])
    def upload_file():
        # Check for parameters
        if 'file' not in request.files:
            return jsonify({'error': 'No file received'}), 400

        # Unpack
        file = request.files['file']
        default_model = request.form.get('defaultModel')
        gemini_api_key = request.form.get('geminiKey')
        openai_api_key = request.form.get('openaiKey')


        # Check if everything is received
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not default_model:
            return jsonify({'error': 'Missing defaultModel parameter'}), 400

        if (gemini_api_key in [None, 'UNSET']) and (openai_api_key in [None, 'UNSET']):
            return jsonify({'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}), 400

        # If file is present and correct type
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # file.save(filename)

            # Different format handler
            if filename.rsplit('.', 1)[1].lower() == 'pdf':
                file = convert_from_bytes(file.read())
                receipt_obj_list = [img for img in file]
            else:
                # Single Png/jpg image
                receipt_obj_list = [PIL.Image.open(file)]

            parsers = [
                ('GEMINI', GeminiReceiptParser, gemini_api_key),
                ('OPENAI', OpenAIReceiptParser, openai_api_key),
                # Additional parsers can be added here
            ]
            # Make sure the default_model parser is the first in the list
            parsers.sort(key=lambda x: x[0] != default_model.upper())

            response = None
            api_key_error_models = []
            # Try each parser in order, default_model first, then the rest
            for model_name, parser_cls, api_key in parsers:
                if api_key == 'UNSET':
                    print(f'Skipping {model_name} parser, {model_name} API key is not set')
                    continue
                try:
                    print(f'Parsing with {model_name} parser')
                    # Init the parser
                    receipt_parser = parser_cls(api_key)
                    # Parse the receipt
                    response = receipt_parser.parse(receipt_obj_list)

                    # If response is not None, we successfully parsed the receipt
                    if response is not None:
                        break
                except APIKeyError:
                    api_key_error_models.append(model_name)
                    if model_name == parsers[-1][0]:
                        return jsonify({'error': f"Invalid API keys for {api_key_error_models}"}), 401
                except Exception as e:
                    print(f"Unexpected error occurred while parsing with {model_name}: {e}")
                    continue

            # After all parsers have been tried, if response is still None, return an error
            if response is None:
                return jsonify({'error': 'Image is not a receipt or error parsing receipt'}), 400

            # Use ReceiptEncoder explicitly because some error with pytest not using
            response_json = json.dumps(response, cls=ReceiptEncoder)
            return Response(response_json, mimetype='application/json'), 200

        return jsonify({'error': 'Invalid file type received'}), 400

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8081)