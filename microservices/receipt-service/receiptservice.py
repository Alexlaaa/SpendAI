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
    search_relevant_receipts,
    get_full_receipt_details
)
import datetime
from pymongo import MongoClient
import os

# Configure logging (if not already configured elsewhere)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection setup
MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://mongodb:27017/')
DATABASE_NAME = os.environ.get('DATABASE_NAME', 'spend_ai')

try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client[DATABASE_NAME]
    embeddings_collection = db['receipt_embeddings']
    logger.info(f"Connected to MongoDB at {MONGODB_URI}")
except Exception as e:
    logger.error(f"Error connecting to MongoDB: {e}")
    mongo_client = None
    db = None
    embeddings_collection = None

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
                relevant_docs = search_relevant_receipts(user_id, query_embedding, limit=10) # Increased context size

                # 3. Determine if this is a category-specific query
                # Common category keywords to detect in user queries
                category_keywords = {
                    'food': ['food', 'meal', 'restaurant', 'dining', 'grocery', 'eat', 'lunch', 'dinner', 'breakfast'],
                    'transport': ['transport', 'transportation', 'travel', 'commute', 'taxi', 'uber', 'lyft', 'bus', 'train', 'mrt', 'subway', 'car'],
                    'housing': ['housing', 'rent', 'mortgage', 'home', 'apartment', 'house', 'utilities', 'electricity', 'water', 'gas'],
                    'clothing': ['clothing', 'clothes', 'fashion', 'apparel', 'shoes', 'wear'],
                    'healthcare': ['healthcare', 'health', 'medical', 'doctor', 'hospital', 'medicine', 'dental', 'pharmacy'],
                    'entertainment': ['entertainment', 'leisure', 'movie', 'concert', 'ticket', 'show', 'game', 'fun', 'recreation'],
                    'education': ['education', 'school', 'tuition', 'course', 'class', 'book', 'learning', 'training']
                }
                
                detected_category = None
                user_message_lower = user_message.lower()
                
                # Check if user is asking about a specific category
                for category, keywords in category_keywords.items():
                    if any(keyword in user_message_lower for keyword in keywords):
                        detected_category = category
                        logger.info(f"Detected category query for: {detected_category}")
                        break
                
                # Get receipt IDs from vector search if we're not using category filter
                unique_receipt_ids = []
                if not detected_category:
                    unique_receipt_ids = list(set([doc['receiptId'] for doc in relevant_docs if 'receiptId' in doc]))
                    logger.info(f"Found {len(unique_receipt_ids)} unique receipt IDs from vector search")
                
                # 4. Get full receipt details from MongoDB
                # Verify if we have access to the receipts collection first
                if mongo_client is not None and db is not None:
                    try:
                        receipts_collection = db['receipts']
                        total_count = receipts_collection.count_documents({"userId": user_id})
                        logger.info(f"Total user receipts in database: {total_count}")
                        
                        # Also count by category with direct query for diagnostics
                        if detected_category:
                            import re
                            category_regex = re.compile(f"^{detected_category}$", re.IGNORECASE)
                            category_count = receipts_collection.count_documents({
                                "userId": user_id,
                                "category": {"$regex": category_regex}
                            })
                            all_food_count = receipts_collection.count_documents({
                                "userId": user_id,
                                "category": {"$regex": re.compile("food", re.IGNORECASE)}
                            })
                            logger.info(f"Database has {category_count} receipts in category: {detected_category}")
                            logger.info(f"Database has {all_food_count} receipts with 'food' in category (case insensitive)")
                            
                            # Diagnostic: list all categories in the database
                            all_categories = receipts_collection.distinct("category", {"userId": user_id})
                            logger.info(f"All categories in database: {all_categories}")
                    except Exception as e:
                        logger.error(f"Error querying database for diagnostics: {e}")
                
                # If category detected, query all receipts in that category
                if detected_category:
                    logger.info(f"Querying ALL receipts in category: {detected_category}")
                    full_receipts = get_full_receipt_details(user_id, [], category_filter=detected_category)
                    
                    # FALLBACK: If no receipts found, try direct DB query instead
                    if len(full_receipts) == 0 and mongo_client is not None and db is not None:
                        logger.warning(f"No receipts found with category filter. Trying direct DB query...")
                        try:
                            receipts_collection = db['receipts']
                            import re
                            category_regex = re.compile(f"^{detected_category}$", re.IGNORECASE)
                            full_receipts = list(receipts_collection.find({
                                "userId": user_id,
                                "category": {"$regex": category_regex}
                            }))
                            logger.info(f"Direct DB query found {len(full_receipts)} receipts")
                        except Exception as e:
                            logger.error(f"Error in fallback direct DB query: {e}")
                else:
                    full_receipts = get_full_receipt_details(user_id, unique_receipt_ids)
                
                logger.info(f"Retrieved {len(full_receipts)} complete receipts from database")
                
                # 5. Format context with both chunks and detailed receipt data
                if relevant_docs:
                    # First include the vector search results
                    retrieved_context_str = "Here are relevant receipt chunks based on your query:\n"
                    for doc in relevant_docs:
                        retrieved_context_str += f"- {doc['textChunk']}\n"
                    
                    # Then add detailed receipt information
                    if full_receipts:
                        # Group receipts by category for easier analysis
                        category_receipts = {}
                        category_totals = {}
                        
                        # First pass: organize receipts by category and calculate category totals
                        for receipt in full_receipts:
                            category = receipt.get('category', 'Unknown')
                            if category not in category_receipts:
                                category_receipts[category] = []
                                category_totals[category] = 0
                                
                            category_receipts[category].append(receipt)
                            total = receipt.get('totalCost', 0)
                            
                            # Detailed logging for receipt values
                            receipt_id = str(receipt.get('_id', 'unknown'))
                            merchant = receipt.get('merchantName', 'N/A')
                            logger.info(f"Processing receipt: {receipt_id} - {merchant} - Category: {category} - Total: {total}")
                            
                            # Ensure total is a number
                            if isinstance(total, str):
                                try:
                                    total = float(total.replace('$', '').strip())
                                except ValueError:
                                    total = 0
                            elif total is None:
                                total = 0
                                
                            # Add to category total and log the addition
                            category_totals[category] += float(total)
                            logger.info(f"Added {total} to {category} total, new total: {category_totals[category]}")
                        
                        # Get TOTAL counts for ALL categories from the database for verification
                        try:
                            if mongo_client is not None and db is not None:
                                receipts_collection = db['receipts']
                                
                                # Case-insensitive search for detected category
                                match_stage = {'$match': {'userId': user_id}}
                                if detected_category:
                                    import re
                                    category_regex = re.compile(f"^{detected_category}$", re.IGNORECASE)
                                    match_stage = {'$match': {
                                        'userId': user_id, 
                                        'category': {'$regex': category_regex}
                                    }}
                                    logger.info(f"Applying category filter with regex: {category_regex.pattern}")
                                
                                # Query to get counts and sums by category for this user
                                pipeline = [
                                    match_stage,
                                    {'$group': {
                                        '_id': '$category', 
                                        'count': {'$sum': 1},
                                        'total': {'$sum': {'$toDouble': {'$ifNull': ['$totalCost', 0]}}},
                                        'merchants': {'$addToSet': '$merchantName'},
                                        'receipts': {'$push': {
                                            'id': {'$toString': '$_id'},
                                            'merchant': '$merchantName',
                                            'date': '$date',
                                            'total': '$totalCost'
                                        }}
                                    }}
                                ]
                                
                                # Execute the aggregation
                                all_category_stats = list(receipts_collection.aggregate(pipeline))
                                
                                # Log the database-calculated totals
                                logger.info("=== DATABASE CALCULATED CATEGORY TOTALS ===")
                                db_total_spending = 0
                                for stat in all_category_stats:
                                    category_name = stat['_id']
                                    category_total = stat['total']
                                    count = stat['count']
                                    logger.info(f"DB CATEGORY: {category_name} - COUNT: {count} - TOTAL: ${category_total:.2f}")
                                    db_total_spending += category_total
                                    
                                    # Update the category totals with the database values for accuracy
                                    if category_name in category_totals:
                                        if abs(category_totals[category_name] - category_total) > 0.01:  # If difference > 1 cent
                                            logger.warning(f"Correcting {category_name} total from ${category_totals[category_name]:.2f} to ${category_total:.2f}")
                                            category_totals[category_name] = category_total
                                
                                logger.info(f"DB TOTAL SPENDING ACROSS ALL CATEGORIES: ${db_total_spending:.2f}")
                        except Exception as e:
                            logger.error(f"Error calculating database totals: {e}")
                        
                        # Log the final calculated category totals
                        logger.info("=== FINAL CALCULATED CATEGORY TOTALS (after DB validation) ===")
                        total_spending = 0
                        for category, total in category_totals.items():
                            logger.info(f"CATEGORY: {category} - TOTAL: ${total:.2f}")
                            total_spending += total
                        logger.info(f"TOTAL SPENDING ACROSS ALL CATEGORIES: ${total_spending:.2f}")
                        
                        # Create an explicit category summary at the VERY beginning for the LLM
                        summary_context = "\n\n=== ACCURATE CATEGORY TOTALS (MUST USE THESE EXACT FIGURES) ===\n"
                        for category_name, total in category_totals.items():
                            if detected_category and detected_category.lower() == category_name.lower():
                                summary_context += f"TOTAL FOR {category_name.upper()} CATEGORY: ${total:.2f} (THIS IS THE CORRECT NUMBER)\n"
                                
                        # Insert summary at the BEGINNING of the context
                        retrieved_context_str = summary_context + retrieved_context_str
                        
                        # Add category-based organization with totals
                        retrieved_context_str += "\n\n=== RECEIPTS BY CATEGORY WITH PRE-CALCULATED TOTALS ===\n"
                        for category, total in category_totals.items():
                            category_emphasis = ""
                            if detected_category and detected_category.lower() == category.lower():
                                category_emphasis = " - THIS IS THE CATEGORY YOU WERE ASKED ABOUT"
                            retrieved_context_str += f"\n## CATEGORY: {category.upper()} - TOTAL: ${total:.2f} (USE THIS EXACT TOTAL){category_emphasis}\n"
                            # List all receipts in this category
                            for receipt in category_receipts[category]:
                                receipt_id = str(receipt.get('_id', 'unknown'))
                                merchant = receipt.get('merchantName', 'N/A')
                                date = receipt.get('date', 'N/A')
                                if isinstance(date, datetime.datetime):
                                    date = date.strftime('%Y-%m-%d')
                                total = receipt.get('totalCost', 'N/A')
                                
                                retrieved_context_str += f"* RECEIPT ID: {receipt_id}\n"
                                retrieved_context_str += f"  Merchant: {merchant}\n"
                                retrieved_context_str += f"  Date: {date}\n"
                                retrieved_context_str += f"  Total: ${total}\n"
                                
                                # Add itemized list if available
                                items = receipt.get('itemizedList', [])
                                if items:
                                    retrieved_context_str += "  Items:\n"
                                    for item in items:
                                        item_name = item.get('itemName', 'unknown')
                                        item_qty = item.get('itemQuantity', 1)
                                        item_cost = item.get('itemCost', 0)
                                        retrieved_context_str += f"    - {item_name}: {item_qty} x ${item_cost}\n"
                        
                        # Also include full individual receipt details for completeness
                        retrieved_context_str += "\n\n=== COMPLETE RECEIPT DETAILS ===\n"
                        for receipt in full_receipts:
                            receipt_id = str(receipt.get('_id', 'unknown'))
                            merchant = receipt.get('merchantName', 'N/A')
                            date = receipt.get('date', 'N/A')
                            if isinstance(date, datetime.datetime):
                                date = date.strftime('%Y-%m-%d')
                            category = receipt.get('category', 'N/A')
                            total = receipt.get('totalCost', 'N/A')
                            
                            retrieved_context_str += f"\nRECEIPT ID: {receipt_id}\n"
                            retrieved_context_str += f"Merchant: {merchant}\n"
                            retrieved_context_str += f"Date: {date}\n"
                            retrieved_context_str += f"Category: {category}\n"
                            retrieved_context_str += f"Total: ${total}\n"
                            
                            # Add itemized list if available
                            items = receipt.get('itemizedList', [])
                            if items:
                                retrieved_context_str += "Items:\n"
                                for item in items:
                                    item_name = item.get('itemName', 'unknown')
                                    item_qty = item.get('itemQuantity', 1)
                                    item_cost = item.get('itemCost', 0)
                                    retrieved_context_str += f"  - {item_name}: {item_qty} x ${item_cost}\n"
                else:
                    retrieved_context_str = "No relevant context found in your receipts for this query."

            logger.info(f"Retrieved Context (truncated):\n{retrieved_context_str[:500]}...")
            logger.debug(f"Full context length: {len(retrieved_context_str)} characters")

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
- IMPORTANT: When reporting financial information, carefully calculate ALL totals accurately. Add up ALL individual values when reporting category totals. Double-check your math.
- If the query asks for insights on a specific category (like 'food', 'transport', etc.), add up all the relevant receipts in that category to calculate the EXACT total amount spent. List all merchants and amounts in that category.
- Always verify numerical consistency in your response. Ensure that individual expenses add up to reported totals.
- For category analysis, first identify ALL receipts in the requested category, list them with their totals, and then sum them accurately.
- Structure your response into paragraphs for readability.
- Write plain text responses - do NOT use markdown formatting with asterisks, backticks, or escaped characters.
- Use the dollar symbol '$' directly without escaping it. For example, write '$10.50' not '\\$10.50'.
- If you need to make an inference based on limited data, do so confidently based on what information is available, without mentioning limitations in the data.
- Base your answer ONLY on the provided history and context. Do not make up information that contradicts the available data, but you can make reasonable inferences from it.
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
