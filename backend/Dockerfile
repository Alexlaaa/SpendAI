# Stage 1: Dev Stage
FROM node:22-alpine

WORKDIR /src/backend

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

# Run the app in development mode (with live-reload)
CMD ["npm", "run", "start:dev"]


## Stage 2: Build Stage
#FROM node:22-alpine AS build
#
#WORKDIR /src/backend
#
#COPY package*.json ./
#RUN npm install
#
#COPY . .
#RUN npm run build

## Stage 3: Production Stage
#FROM node:22-alpine AS production
#
#WORKDIR /src/backend
#
#COPY --from=build /src/backend/dist ./dist
#COPY --from=build /src/backend/node_modules ./node_modules
#COPY --from=build /src/backend/package*.json ./
#
#EXPOSE 8080
#
#CMD ["node", "dist/main"]
