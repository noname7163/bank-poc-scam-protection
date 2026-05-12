FROM node:22-alpine

# DejaVu fonts give @napi-rs/canvas something to render with on Alpine,
# which otherwise ships without any TTFs. Used by the Layer 2 image renderer.
RUN apk add --no-cache ttf-dejavu

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
