# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install ALL dependencies including devDependencies
RUN yarn install --frozen-lockfile

# Copy source code and configuration files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code
RUN yarn build

# Compile seed file with adjusted import path
RUN sed -i 's|../src/config/seed|../dist/config/seed|g' prisma/seed.ts && \
    npx tsc prisma/seed.ts --outDir prisma --target ES2015 --module commonjs --esModuleInterop

# Add node_modules/.bin to PATH to ensure Jest and other tools are available
ENV PATH="/app/node_modules/.bin:${PATH}"

# Test stage
FROM builder AS test
WORKDIR /app
# No additional setup needed as we inherit everything from builder

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma/seed.js ./prisma/
COPY prisma/migrations ./prisma/migrations
COPY prisma/schema.prisma ./prisma/
COPY .env ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Create and set up start script
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e
set -a
source .env
set +a
npx prisma migrate deploy
NODE_PATH=. npx prisma db seed
exec node dist/server.js
EOF

RUN chmod +x /app/start.sh

# Expose the port your app runs on
EXPOSE 3000

# Start the application using the startup script
CMD ["/app/start.sh"] 