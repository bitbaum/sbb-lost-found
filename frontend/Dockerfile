# Frontend Dockerfile for Development
# node:24 — pnpm 11 needs Node >= 22.13, and 24 is the fleet default.
FROM node:24-alpine

WORKDIR /app

# corepack reads the packageManager pin from package.json
RUN corepack enable pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "run", "dev"]
