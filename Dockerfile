FROM node:20-alpine

WORKDIR /app

# Copy dependency configuration files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (dev dependencies needed for prisma generate and tsc build)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Generate the Prisma client based on prisma/schema.prisma
RUN npx prisma generate

# Build typescript code to javascript (outputs to dist/)
RUN npm run build

# Expose backend API port
EXPOSE 5000
ENV PORT=5000

# Push migrations to database and run the node app
CMD ["sh", "-c", "npx prisma db push && node dist/app.js"]
