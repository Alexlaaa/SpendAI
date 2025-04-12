from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from gemini import GeminiReceiptParser, GeminiReceiptReview
from Receipt import ReceiptEncoder
from Exceptions import APIKeyError
from gpt4o import OpenAIReceiptParser, OpenAIReceiptReview
from flask import Response
from pdf2image import convert_from_bytes
import os
import json
import PIL.Image
import logging
from rag_utils import (
    store_receipt_embedding,
    chunk_receipt_text,
    generate_embedding,
    search_relevant_receipts
)

# Configure logging (if not already configured elsewhere)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

    @app.route('/embed-receipt', methods=['POST'])
    def embed_receipt():
        """
        Endpoint to receive receipt data from the backend,
        generate embeddings, and store them.
        Expects JSON payload: { "userId": "...", "receiptId": "...", "receiptData": {...} }
        """
        logger.info("Received request to /embed-receipt")
        data = request.json

        user_id = data.get('userId')
        receipt_id = data.get('receiptId')
        receipt_data = data.get('receiptData')

        if not user_id or not receipt_id or not receipt_data:
            logger.error("Missing userId, receiptId, or receiptData in /embed-receipt request")
            return jsonify({'error': 'Missing userId, receiptId, or receiptData'}), 400

        logger.info(f"Processing embedding for userId: {user_id}, receiptId: {receipt_id}")

        try:
            # Chunk the receipt data into text pieces
            text_chunks = chunk_receipt_text(receipt_data)
            if not text_chunks:
                logger.warning(f"No text chunks generated for receipt {receipt_id}")
                return jsonify({'message': 'No text chunks to embed'}), 200 # Not an error, just nothing to do

            # Generate and store embedding for each chunk
            success_count = 0
            for chunk in text_chunks:
                if store_receipt_embedding(user_id, receipt_id, chunk):
                    success_count += 1

            logger.info(f"Successfully stored {success_count}/{len(text_chunks)} embeddings for receipt {receipt_id}")
            if success_count == len(text_chunks):
                 return jsonify({'message': f'Successfully embedded {success_count} chunks for receipt {receipt_id}'}), 201
            else:
                 # Partial success or failure
                 logger.warning(f"Partial embedding success for receipt {receipt_id}: {success_count}/{len(text_chunks)}")
                 return jsonify({'warning': f'Partially embedded {success_count}/{len(text_chunks)} chunks for receipt {receipt_id}'}), 207 # Multi-Status

        except Exception as e:
            logger.error(f"Error during embedding process for receipt {receipt_id}: {e}", exc_info=True)
            return jsonify({'error': 'Internal server error during embedding'}), 500

    @app.route('/chat', methods=['POST'])
    def handle_chat():
        """
        Endpoint to handle chat messages, perform RAG, and get LLM response.
        Expects JSON payload: { "userId": "...", "message": "...", "history": [...] }
        """
        logger.info("Received request to /chat")
        data = request.json

        user_id = data.get('userId')
        user_message = data.get('message')
        history = data.get('history', []) # List of {"sender": "user/ai", "content": "..."}

        # --- Get API Keys (assuming they are passed in request for now) ---
        api_keys = data.get('apiKeys', {})
        default_model = api_keys.get('defaultModel')
        gemini_api_key = api_keys.get('geminiKey')
        openai_api_key = api_keys.get('openaiKey')
        # --- End API Key Handling ---

        if not user_id or not user_message:
            logger.error("Missing userId or message in /chat request")
            return jsonify({'error': 'Missing userId or message'}), 400

        if not default_model or ((gemini_api_key in [None, 'UNSET']) and (openai_api_key in [None, 'UNSET'])):
             logger.error("Missing defaultModel or API keys in /chat request")
             return jsonify({'error': 'Missing defaultModel or API keys (Gemini/OpenAI)'}), 400

        logger.info(f"Processing chat for userId: {user_id}, message: {user_message[:50]}...")

        try:
            # 1. Generate embedding for the user's message
            query_embedding = generate_embedding(user_message)
            if not query_embedding:
                logger.error("Failed to generate query embedding.")
                # Fallback: proceed without RAG context
                retrieved_context_str = "No relevant context found."
            else:
                # 2. Search for relevant receipt chunks
                relevant_docs = search_relevant_receipts(user_id, query_embedding, limit=3) # Limit context size

                # 3. Format retrieved context
                if relevant_docs:
                    retrieved_context_str = "Here's some potentially relevant context from your receipts:\n"
                    for doc in relevant_docs:
                        retrieved_context_str += f"- {doc['textChunk']} (Relevance score: {doc['score']:.4f})\n"
                    retrieved_context_str = retrieved_context_str.strip()
                else:
                    retrieved_context_str = "No relevant context found in your receipts for this query."

            logger.info(f"Retrieved Context:\n{retrieved_context_str}")

            # 4. Construct the prompt for the LLM
            # Combine history, new message, and context
            # Simple history formatting:
            formatted_history = "\n".join([f"{msg['sender'].upper()}: {msg['content']}" for msg in history])

            prompt = f"""Conversation History:
{formatted_history}

Relevant Context from Receipts:
{retrieved_context_str}

Current User Query:
USER: {user_message}

Analyze the provided conversation history and receipt context to answer the user's query.
- If the query asks for insights on a specific category (like 'food', 'transport', etc.), try to summarize spending patterns or list relevant items/merchants found within THAT category in the provided context. Calculate totals if possible from the context.
- For general insight queries, summarize the key spending areas reflected in the context.
- If the context is insufficient to fully answer, clearly state what information you can provide based on the limited context and mention that more data might be needed for a complete picture.
- Base your answer ONLY on the provided history and context. Do not make up information.
AI:"""

            logger.debug(f"Constructed LLM Prompt:\n{prompt}")


            # 5. Select LLM and get response (similar logic to /review)
            reviewers = [
                ('GEMINI', GeminiReceiptReview, gemini_api_key),
                ('OPENAI', OpenAIReceiptReview, openai_api_key),
            ]
            reviewers.sort(key=lambda x: x[0] != default_model.upper())

            llm_response_content = None
            api_key_error_models = []

            for model_name, reviewer_cls, api_key in reviewers:
                if api_key == 'UNSET':
                    logger.info(f'Skipping {model_name} for chat, API key not set')
                    continue
                try:
                    logger.info(f'Attempting chat with {model_name}')
                    reviewer = reviewer_cls(api_key)
                    # Use the new 'chat_with_prompt' method designed for direct prompt handling
                    llm_response_content = reviewer.chat_with_prompt(prompt) # Pass augmented prompt directly

                    if llm_response_content is not None:
                        logger.info(f"Successfully got response from {model_name} using chat_with_prompt")
                        break
                except APIKeyError:
                    logger.warning(f"Invalid API key for {model_name}")
                    api_key_error_models.append(model_name)
                    if model_name == reviewers[-1][0]: # If last attempt failed due to API key
                         return jsonify({'error': f"Invalid API keys for {api_key_error_models}"}), 401
                except Exception as e:
                    logger.error(f"Unexpected error during chat with {model_name}: {e}", exc_info=True)
                    continue # Try next model

            # 6. Handle response or fallback
            if llm_response_content is None:
                logger.error("Failed to get response from any LLM model.")
                # Provide a generic error response
                llm_response_content = "Sorry, I encountered an error trying to process your request with the AI models."
                return jsonify({'response': llm_response_content}), 500 # Internal Server Error

            logger.info(f"Final AI response: {llm_response_content}")
            return jsonify({'response': llm_response_content}), 200

        except Exception as e:
            logger.error(f"Error during chat processing: {e}", exc_info=True)
            return jsonify({'error': 'Internal server error during chat processing'}), 500

    @app.route('/delete-embeddings/<receipt_id>', methods=['DELETE'])
    def delete_embeddings(receipt_id):
        """
        Endpoint to delete all embedding chunks associated with a specific receipt ID.
        """
        logger.info(f"Received request to delete embeddings for receiptId: {receipt_id}")

        if not receipt_id:
            logger.error("Missing receiptId in /delete-embeddings request")
            return jsonify({'error': 'Missing receiptId parameter'}), 400

        # Ensure MongoDB connection is available
        if embeddings_collection is None:
             logger.error("MongoDB connection not available for deleting embeddings.")
             return jsonify({'error': 'Database connection error'}), 500

        try:
            result = embeddings_collection.delete_many({"receiptId": receipt_id})
            logger.info(f"Deleted {result.deleted_count} embedding(s) for receipt {receipt_id}.")
            return jsonify({'message': f'Successfully deleted {result.deleted_count} embeddings for receipt {receipt_id}'}), 200
        except Exception as e:
            logger.error(f"Error deleting embeddings for receipt {receipt_id}: {e}", exc_info=True)
            return jsonify({'error': 'Internal server error during embedding deletion'}), 500

    return app


if __name__ == '__main__':
    app = create_app()
    # Use environment variable for port, default to 8081
    port = int(os.environ.get('PORT', 8081))
    # Use 0.0.0.0 to be accessible within Docker network
    app.run(host='0.0.0.0', port=port)
