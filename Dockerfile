# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /usr/src/app

# Install deps first for better caching
COPY package*.json ./
# Try fast + reproducible; if no lockfile, fallback cleanly
RUN npm ci --omit=dev || npm install --omit=dev

# Copy the rest of the app
COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
