# Use small, secure base
FROM node:20-alpine

# Create app dir
WORKDIR /usr/src/app

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev || npm ci

# Copy app
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run expects the container to listen on $PORT
EXPOSE 8080

# Start command
CMD ["npm", "start"]
