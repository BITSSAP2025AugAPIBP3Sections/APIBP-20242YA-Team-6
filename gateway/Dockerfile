FROM node:20-alpine
WORKDIR /app

# Install dependencies (supports npm or pnpm if lockfile exists)
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
		npm i -g pnpm && pnpm install --frozen-lockfile; \
	else \
		npm install --production=false; \
	fi

# Copy source
COPY tsconfig.json ./tsconfig.json
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose & run
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
