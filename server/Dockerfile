# Dockerfile for ReviewLens Express Backend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose API port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
