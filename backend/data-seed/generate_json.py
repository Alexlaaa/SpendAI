import json
import random
from datetime import datetime, timedelta
import os

def generate_oid():
    return ''.join(random.choices('abcdef0123456789', k=24))

def generate_random_date(start_date, end_date):
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

merchant_names = ["Osteria 177", "JOSE CHIQUITO RESTAURANT", "HEN AND CHICKEN", "Grab", "Shell Gas Station", 
                  "Train Service", "Bike Rental", "Zara", "Nike", "IKEA", "McDonald's", "Pizza Hut"]
categories = ["Food", "Transport", "Clothing", "Healthcare", "Leisure", "Housing", "Others"]

itemized_samples = {
    "Food": [
        {"itemName": "Big Mac Meal", "itemCost": 12},
        {"itemName": "French Toast", "itemCost": 11},
        {"itemName": "Chicken Bucket", "itemCost": 25}
    ],
    "Transport": [
        {"itemName": "Ride to Work", "itemCost": 15},
        {"itemName": "Fuel", "itemCost": 120},
        {"itemName": "Monthly Train Pass", "itemCost": 50}
    ],
    "Clothing": [
        {"itemName": "Summer Dress", "itemCost": 120},
        {"itemName": "Nike Zoom Vomero 5", "itemCost": 80}
    ],
    "Healthcare": [
        {"itemName": "Teeth Cleaning", "itemCost": 300},
        {"itemName": "Prescription Glasses", "itemCost": 200}
    ],
    "Leisure": [
        {"itemName": "Concert Tickets", "itemCost": 100},
        {"itemName": "Movie Ticket", "itemCost": 25}
    ],
    "Housing": [
        {"itemName": "Wooden Dining Table", "itemCost": 200},
        {"itemName": "Air Purifier", "itemCost": 299}
    ],
    "Others": [
        {"itemName": "Phone Case", "itemCost": 80},
        {"itemName": "Laptop Accessories", "itemCost": 300}
    ]
}

def generate_transactions(num_transactions, start_date, end_date):
    transactions = []
    
    for _ in range(num_transactions):
        merchant = random.choice(merchant_names)
        category = random.choice(categories)
        available_items = itemized_samples[category]
        num_items_to_sample = min(random.randint(1, 3), len(available_items))
        items = random.sample(available_items, num_items_to_sample)
        
        itemized_list = []
        total_cost = 0
        for item in items:
            quantity = random.randint(1, 5)
            cost = item["itemCost"] * quantity
            itemized_list.append({
                "itemName": item["itemName"],
                "itemQuantity": quantity,
                "itemCost": item["itemCost"]
            })
            total_cost += cost
        
        transaction = {
            "_id": {"$oid": generate_oid()},
            "merchantName": merchant,
            "date": {"$date": generate_random_date(start_date, end_date).isoformat() + "Z"},
            "totalCost": total_cost,
            "category": category,
            "itemizedList": itemized_list,
            "userId": '66f0cae53f33fc7276ec3c40',
            "__v": 0
        }
        transactions.append(transaction)
    
    return transactions

def handle_existing_file(file_path):
    if os.path.exists(file_path):
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        new_file_name = f"{file_path.replace('.json', '')}-old-{timestamp}.json"
        os.rename(file_path, new_file_name)

start_date = datetime(2024, 1, 1)
end_date = datetime(2024, 10, 30)
transactions = generate_transactions(50, start_date, end_date)

file_path = 'expense_note.receipts.json'
handle_existing_file(file_path)

with open(file_path, 'w') as f:
    json.dump(transactions, f, indent=2)
