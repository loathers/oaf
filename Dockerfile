FROM node:24-slim

# Install system Chromium and fonts for Puppeteer rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Use system Chromium instead of Puppeteer's bundled one
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Enable Corepack for Yarn 4.4.1
RUN corepack enable

# Copy package manifests first for better layer caching
COPY package.json yarn.lock .yarnrc.yml ./

# Install dependencies (skip husky prepare and Puppeteer download)
RUN YARN_ENABLE_SCRIPTS=false yarn install --immutable

# Copy full source
COPY . .

# Build
RUN yarn build

CMD npm run migrate && node --import tsx ./src/index.ts
