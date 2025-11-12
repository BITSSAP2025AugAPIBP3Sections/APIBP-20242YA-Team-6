FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; else npm install --production=false; fi
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 8006
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
