import os
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
import logging
from bson import ObjectId
from dateutil import parser

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv() # Load .env file if present (for local runs outside docker)

from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

# --- Configuration ---
# Use localhost and the EXPOSED port since this script runs on the host
# Get MongoDB URI from env, default to standard local Atlas CLI port if not set
MONGODB_URI_DEFAULT = "mongodb://localhost:27017/"
MONGODB_URI_ENV = os.getenv("BACKFILL_MONGO_URI", MONGODB_URI_DEFAULT)
DATABASE_NAME = os.getenv("DATABASE_NAME", "spend_ai")
RECEIPTS_COLLECTION_NAME = "receipts"
EMBEDDINGS_COLLECTION_NAME = os.getenv("EMBEDDINGS_COLLECTION", "receipt_embeddings")
EMBED_ENDPOINT_URL = os.getenv("BACKFILL_EMBED_URL", "http://localhost:8081/embed-receipt")

# --- MongoDB Connection ---
try:
    # Parse the base URI
    parsed_uri = urlparse(MONGODB_URI_ENV)

    # Ensure the database name is in the path
    path_parts = parsed_uri.path.split('/')
    if len(path_parts) < 2 or path_parts[1] != DATABASE_NAME:
        # Add or replace database name in path
        new_path = f"/{DATABASE_NAME}"
    else:
        new_path = parsed_uri.path

    # Parse query parameters
    query_params = parse_qs(parsed_uri.query)
    # Ensure directConnection=true is set
    query_params['directConnection'] = ['true']
    new_query = urlencode(query_params, doseq=True)

    # Reconstruct the final URI
    final_uri = urlunparse((
        parsed_uri.scheme,
        parsed_uri.netloc,
        new_path,
        parsed_uri.params,
        new_query,
        parsed_uri.fragment
    ))

    logger.info(f"Connecting to MongoDB at: {final_uri}")
    mongo_client = MongoClient(final_uri) # Use the final constructed URI
    db = mongo_client[DATABASE_NAME]
    receipts_collection = db[RECEIPTS_COLLECTION_NAME]
    embeddings_collection = db[EMBEDDINGS_COLLECTION_NAME] # Use the defined variable
    # Test connection
    mongo_client.admin.command('ping')
    logger.info(f"Successfully connected to MongoDB database: {DATABASE_NAME}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    exit(1) # Exit if DB connection fails

def format_date(date_obj):
    """Safely format date object to YYYY-MM-DD string."""
    if date_obj:
        try:
            # Use dateutil parser for flexibility, then format
            parsed_date = parser.parse(str(date_obj))
            return parsed_date.strftime('%Y-%m-%d')
        except Exception:
            logger.warning(f"Could not parse date: {date_obj}. Sending as null.")
            return None
    return None

# Modify backfill to accept collection objects as arguments
def backfill(receipts_coll, embeddings_coll):
    """Fetches receipts and triggers embedding for each."""
    logger.info(f"Starting embedding backfill from collection '{RECEIPTS_COLLECTION_NAME}'...")
    receipts_to_process = list(receipts_coll.find()) # Use passed argument
    total_receipts = len(receipts_to_process)
    logger.info(f"Found {total_receipts} receipts to process.")

    processed_count = 0
    error_count = 0

    for receipt in receipts_to_process:
        receipt_id = str(receipt.get('_id', 'N/A'))
        user_id = receipt.get('userId')

        if not isinstance(receipt.get('_id'), ObjectId) or not user_id:
             logger.warning(f"Skipping receipt with invalid ID or missing userId: {receipt_id}")
             error_count += 1
             continue

        # Prepare payload for the embedding endpoint
        receipt_data_for_embedding = {
            "merchantName": receipt.get("merchantName"),
            "date": format_date(receipt.get("date")), # Format date safely
            "totalCost": receipt.get("totalCost"),
            "category": receipt.get("category"),
            "itemizedList": receipt.get("itemizedList", [])
        }

        payload = {
            "userId": str(user_id),
            "receiptId": receipt_id,
            "receiptData": receipt_data_for_embedding,
        }

        logger.info(f"Processing receipt {processed_count + 1}/{total_receipts} (ID: {receipt_id})...")

        # --- Delete existing embeddings for this receiptId first ---
        try:
            # Use the passed embeddings_coll argument
            delete_result = embeddings_coll.delete_many({"receiptId": receipt_id})
            logger.info(f"Deleted {delete_result.deleted_count} existing embedding(s) for receipt {receipt_id}.")
        except Exception as e:
            logger.error(f"Error deleting existing embeddings for receipt {receipt_id}: {e}")
            error_count += 1
            continue # Skip processing this receipt if deletion failed
        # ---------------------------------------------------------

        try:
            response = requests.post(EMBED_ENDPOINT_URL, json=payload, timeout=30) # Added timeout
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

            if response.status_code in [200, 201, 207]: # Handle success and partial success
                 logger.info(f"Successfully triggered embedding for receipt {receipt_id}. Status: {response.status_code}. Response: {response.text[:100]}")
            else:
                 logger.warning(f"Unexpected status code {response.status_code} for receipt {receipt_id}. Response: {response.text[:100]}")
                 error_count += 1

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to trigger embedding for receipt {receipt_id}: {e}")
            error_count += 1
        except Exception as e:
             logger.error(f"An unexpected error occurred while processing receipt {receipt_id}: {e}")
             error_count += 1

        processed_count += 1

    logger.info("-----------------------------------------")
    logger.info(f"Backfill complete.")
    logger.info(f"Total receipts processed: {processed_count}")
    logger.info(f"Errors encountered: {error_count}")
    logger.info("-----------------------------------------")


if __name__ == "__main__":
    # Ensure the receipt-service container is running before starting
    logger.info(f"Ensure the receipt-service is running and accessible at {EMBED_ENDPOINT_URL}")
    # Also ensure MongoDB connection was successful before proceeding
    if receipts_collection is not None and embeddings_collection is not None:
        input("Press Enter to start the backfill process...")
        # Pass the collection objects to the backfill function
        backfill(receipts_collection, embeddings_collection)
    else:
        logger.error("Cannot start backfill: MongoDB connection failed.")
