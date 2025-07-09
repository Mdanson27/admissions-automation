# Use a Debian-based Node image
FROM node:18-bullseye-slim

# Install Chromium (for Puppeteer)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer where Chromium lives
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Expose port and set start
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
