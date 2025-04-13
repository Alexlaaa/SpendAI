# # For development
# FROM node:20 AS base

# WORKDIR /src/frontend

# # copy package.json from local directory to container working directory
# # Install dependencies
# COPY package*.json ./
# RUN npm install

# # copy all the files in local directory to container working directory
# COPY . .

# # If fail tests, stops the build
# RUN echo "Running tests..."
# RUN npm run test:ci -- --verbose || (echo "Tests failed" && exit 1)

# # If tests pass, continue with the build
# FROM base AS runtime

# EXPOSE 3000

# CMD ["npm", "run", "dev"]

# For production
FROM node:20 AS base

WORKDIR /src/frontend

COPY package*.json ./

RUN npm install

COPY . .
RUN rm -rf .next || true
RUN npm run build -- --no-lint

EXPOSE 3000

CMD ["npm", "start"]
