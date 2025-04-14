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
├── backend
│   ├── Dockerfile
│   └── src
└── microservices
    ├── Dockerfile
    └── receiptservice.py
```

## Setup and Running

### Prerequisites

- Docker / Docker Desktop
- [Atlas CLI](https://www.mongodb.com/docs/atlas/cli/stable/install-atlas-cli/)

### Running the Application

**Important:** This application uses MongoDB Atlas Vector Search for its RAG (Retrieval-Augmented Generation) feature. This requires a local Atlas deployment environment to be running _before_ starting the main application stack with Docker Compose.

1. **Start Local Atlas Deployment:**

   - Open your terminal (outside of Docker).
   - Run the following command to set up and start the local Atlas deployment on the standard port `27017`:

     ```bash
     atlas deployments setup --type local --port 27017
     ```

   - During the setup, you will be prompted:
     - `? How do you want to set up your local Atlas deployment?` -> Select `default`.
     - `? How would you like to connect to <deploymentName>?` -> You can select `compass` to open MongoDB Compass and connect automatically, or `skip`.
   - Leave this terminal window running; it hosts your local Atlas deployment.

2. **Run the Application Stack:**

   - Open a _new_ terminal window.
   - Navigate to the project root directory.
   - Run the following command to build and start the frontend, backend, and microservice containers:

     ```bash
     docker compose up --build
     ```

     _(Note: The original `docker-compose` command is often aliased or replaced by `docker compose` in newer Docker versions)._

3. **Create Vector Search Index:**
   - You need to create the vector search index required for the RAG feature.
   - Open a **new** terminal window (keep the deployment running in the other).
   - Navigate to the project root directory (`SpendAI`).
   - Run the following command, replacing `<deploymentName>` with the name shown in the previous step (e.g., `local4067`):
     ```bash
     atlas deployments search indexes create vector_index --deploymentName <deploymentName> --file vector_index_definition.json
     ```
   - Wait for the command to confirm `Search index created...`. You can monitor the index status in Compass (under the "Search Indexes" tab for the `receipt_embeddings` collection) or using `atlas deployments search indexes list ...` until it shows as "READY" or "ACTIVE".
   - You only need to do this index creation step once per local deployment setup.

4. **Access Services:**
   - Frontend UI: `http://localhost:3000`
   - Backend API (e.g., for Postman): `http://localhost:8080`
   - Microservice (if needed directly): `http://localhost:8081`
   - Local Atlas MongoDB (via Compass/mongosh): `mongodb://localhost:27017/` (Connect using the connection string provided by the `atlas deployments setup` command or directly to localhost on the specified port).
