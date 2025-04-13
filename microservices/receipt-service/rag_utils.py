import os
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# --- Configuration ---
MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "spend_ai")
EMBEDDINGS_COLLECTION = os.getenv("EMBEDDINGS_COLLECTION", "receipt_embeddings")
VECTOR_INDEX_NAME = os.getenv("VECTOR_INDEX_NAME", "vector_index")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

if not MONGODB_URI:
    logger.error("MONGODB_URI environment variable not set.")

# --- MongoDB Connection ---
try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client[DATABASE_NAME]
    embeddings_collection = db[EMBEDDINGS_COLLECTION]
    logger.info(f"Successfully connected to MongoDB database: {DATABASE_NAME}")

except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    mongo_client = None
    db = None
    embeddings_collection = None

# --- Sentence Transformer Model ---
try:
    logger.info(f"Loading Sentence Transformer model: {EMBEDDING_MODEL_NAME}")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    # Get embedding dimension dynamically
    EMBEDDING_DIMENSION = embedding_model.get_sentence_embedding_dimension()
    logger.info(f"Embedding model loaded successfully. Dimension: {EMBEDDING_DIMENSION}")
except Exception as e:
    logger.error(f"Failed to load Sentence Transformer model '{EMBEDDING_MODEL_NAME}': {e}")
    embedding_model = None
    EMBEDDING_DIMENSION = None

# --- Functions ---

def get_full_receipt_details(user_id: str, receipt_ids: list[str], category_filter=None):
    """
    Fetches complete receipt details from the main receipts collection.
    
    Args:
        user_id: User ID to fetch receipts for
        receipt_ids: List of receipt IDs to fetch details for
        category_filter: Optional category name to filter by
        
    Returns:
        List of complete receipt documents
    """
    if mongo_client is None or db is None:
        logger.error("MongoDB connection not available for receipt lookup.")
        return []
    
    try:
        # Connect to the receipts collection
        receipts_collection = db['receipts']
        
        # Build the query based on inputs
        if category_filter:
            # Query by user ID and category - use regex for case insensitive match
            logger.info(f"Querying ALL receipts for user {user_id} in category: {category_filter}")
            import re
            category_regex = re.compile(f"^{category_filter}$", re.IGNORECASE)
            query = {
                "userId": user_id,
                "category": {"$regex": category_regex}
            }
        else:
            # Convert string IDs to ObjectId if needed
            from bson.objectid import ObjectId
            object_ids = []
            for rid in receipt_ids:
                try:
                    object_ids.append(ObjectId(rid))
                except Exception as e:
                    logger.warning(f"Could not convert receipt ID {rid} to ObjectId: {e}")
            
            # Query for the receipts with both the user ID and the receipt IDs
            query = {
                "userId": user_id,
                "_id": {"$in": object_ids}
            }
            logger.info(f"Querying receipts collection for {len(object_ids)} receipts for user {user_id}")
        
        # Execute the query
        receipts = list(receipts_collection.find(query))
        logger.info(f"Found {len(receipts)} complete receipt documents")
        
        # Return the full receipt data
        return receipts
    except Exception as e:
        logger.error(f"Error fetching receipt details: {e}")
        return []

def generate_embedding(text: str):
    """Generates an embedding for the given text using the loaded model."""
    if not embedding_model:
        logger.error("Embedding model not loaded.")
        return None
    try:
        embedding = embedding_model.encode(text, convert_to_tensor=False).tolist()
        return embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None

def store_receipt_embedding(user_id: str, receipt_id: str, text_chunk: str):
    """Generates and stores embedding for a receipt text chunk."""
    if embeddings_collection is None or embedding_model is None:
        logger.error("MongoDB connection or embedding model not available.")
        return False

    embedding = generate_embedding(text_chunk)
    if not embedding:
        return False

    try:
        doc = {
            "userId": user_id,
            "receiptId": receipt_id,
            "textChunk": text_chunk,
            "embedding": embedding,
            "createdAt": datetime.datetime.utcnow()
        }
        result = embeddings_collection.insert_one(doc)
        logger.info(f"Stored embedding for receipt {receipt_id}, chunk: {text_chunk[:50]}...")
        return result.acknowledged
    except Exception as e:
        logger.error(f"Error storing embedding in MongoDB: {e}")
        return False

def search_relevant_receipts(user_id: str, query_embedding, limit=5):
    """Performs vector search on MongoDB to find relevant receipt chunks for a user."""
    # Corrected check for collection object
    if embeddings_collection is None or not VECTOR_INDEX_NAME:
        logger.error("MongoDB connection or vector index name not available.")
        return []

    if not query_embedding:
        logger.error("Invalid query embedding provided.")
        return []
    logger.debug(f"Query Embedding (first 10 dims): {query_embedding[:10]}") # Log query embedding sample

    # Increase the limit to retrieve more context
    limit = 10

    # MongoDB Atlas Vector Search Aggregation Pipeline Stage
    # Ensure the index name and path match your Atlas setup
    vector_search_stage = {
        '$vectorSearch': {
            'index': VECTOR_INDEX_NAME,
            'path': 'embedding', # Field containing the vector embeddings
            'queryVector': query_embedding,
            'numCandidates': 50, # Number of candidates to consider (adjust as needed)
            'limit': limit, # Number of results to return
            'filter': { # Filter results for the specific user
                'userId': user_id
            }
        }
    }

    # Project stage to return relevant fields and the search score
    project_stage = {
        '$project': {
            '_id': 0, # Exclude the default MongoDB ID
            'receiptId': 1,
            'textChunk': 1,
            'score': { '$meta': 'vectorSearchScore' } # Include the similarity score
        }
    }

    pipeline = [vector_search_stage, project_stage]
    logger.debug(f"Vector search pipeline: {pipeline}") # Log the pipeline

    try:
        logger.info(f"Performing vector search for user {user_id}...")
        results = list(embeddings_collection.aggregate(pipeline))
        logger.info(f"Vector search completed. Found {len(results)} relevant chunks.")
        if results:
             logger.debug(f"Top search result example: {results[0]}") # Log top result if found
        # Example result format: [{'receiptId': '...', 'textChunk': '...', 'score': 0.987...}, ...]
        return results
    except Exception as e:
        # Handle specific PyMongo errors if needed, e.g., OperationFailure if index doesn't exist
        logger.error(f"Error during vector search: {e}")
        return []

# --- Helper for Text Chunking (Example) ---
# Improved chunking strategy
def chunk_receipt_text(receipt_data: dict) -> list[str]:
    """Chunks receipt data into potentially more searchable text pieces with detailed item information."""
    chunks = []
    merchant = receipt_data.get('merchantName', 'N/A')
    receipt_date = receipt_data.get('date', 'N/A') # Already formatted YYYY-MM-DD or None
    category = receipt_data.get('category', 'N/A')
    total = receipt_data.get('totalCost', 'N/A')
    receipt_id = str(receipt_data.get('_id', 'unknown'))

    # Chunk 1: Basic info string with receipt ID for lookup
    chunks.append(f"Receipt ID: {receipt_id} from {merchant} on {receipt_date}. Category: {category}. Total: {total}.")

    # Chunk 2: Merchant-specific chunk with date and receipt ID
    if merchant != 'N/A':
        chunks.append(f"Purchase at {merchant} on {receipt_date}. Receipt ID: {receipt_id}. Category: {category}. Total: {total}.")

    # Chunk 3: Category-specific chunk with merchant
    if category != 'N/A':
         chunks.append(f"Category {category} purchase at {merchant} on {receipt_date}. Receipt ID: {receipt_id}. Total: {total}.")

    # Individual Items with more detailed context
    item_list = receipt_data.get('itemizedList', [])
    if item_list:
        # Chunk 4: All items together for overview queries
        all_items = ", ".join([f"{item.get('itemName', 'unknown item')} (${item.get('itemCost', 'N/A')})" for item in item_list])
        chunks.append(f"Receipt from {merchant} on {receipt_date} includes: {all_items}. Receipt ID: {receipt_id}.")
        
        # Chunk 5+: Individual items with full receipt context
        for item in item_list:
            item_name = item.get('itemName', 'N/A')
            item_qty = item.get('itemQuantity', 1)
            item_cost = item.get('itemCost', 'N/A')
            
            # Create a detailed chunk for each item that includes merchant and receipt context
            chunks.append(f"Purchased {item_name} at {merchant} on {receipt_date}. Quantity: {item_qty}, Cost: ${item_cost}. "
                          f"Part of {category} purchase, total receipt: ${total}. Receipt ID: {receipt_id}.")
            
            # Also create an item-only chunk for direct item queries
            chunks.append(f"Item: {item_name}, Quantity: {item_qty}, Cost: ${item_cost}. "
                          f"Purchased at {merchant} on {receipt_date}. Receipt ID: {receipt_id}.")

    # Filter out empty or meaningless chunks if any were generated
    final_chunks = [chunk for chunk in chunks if chunk and len(chunk.strip()) > 5] # Basic filter

    logger.debug(f"Generated {len(final_chunks)} chunks for receipt {receipt_id}.")
    return final_chunks

# Import datetime at the end to avoid potential circular dependency if other modules import this
import datetime
