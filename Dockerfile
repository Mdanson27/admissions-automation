# Dockerfile
FROM node:20-slim

# Install Chromium
RUN apt-get update \
 && apt-get install -y \
      chromium \
 && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use the system Chromium
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PORT=8080

# Create app directory
WORKDIR /usr/src/app

# Copy package.json & lock, install deps
COPY package*.json ./
RUN npm install --production

# Copy rest of your source
COPY . .

# Expose Cloud Run port
EXPOSE 8080

# Run your server
CMD ["node", "server.js"]
