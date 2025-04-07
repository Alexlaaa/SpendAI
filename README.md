# SC4052 Cloud Computing

## Project Overview
This project is part of the SC4052 Cloud Computing course.

## Project Structure
```
.
├── compose.yaml
├── frontend
│   ├── Dockerfile
│   └── src
└── microservices
    ├── Dockerfile
    └── receiptservice.py
```

## Setup and Running

### Prerequisites
- Docker / Docker Desktop

### Running the Application
1. Clone the repository
2. Navigate to the project root directory
3. Run the following command:
   ```
   docker-compose up --build
   ```
4. Access Frontend UI at `http://localhost:3000`
5. Access MongoDB instance at `mongodb://root:secret@localhost:27017/spend_ai?authSource=admin`
