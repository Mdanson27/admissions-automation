# 1. Use a Node.js base image (Debian-based)
FROM node:20-slim

# 2. Install Chromium & dependencies
RUN apt-get update \
 && apt-get install -y chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

# 3. Let Puppeteer know to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    PORT=8080

WORKDIR /usr/src/app

# 4. Copy and install only production deps
COPY package*.json ./
RUN npm install --production

# 5. Copy rest of your source code
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
