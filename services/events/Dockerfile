FROM node:20-alpine
WORKDIR /app
COPY services/events/package.json services/events/package-lock.json* services/events/pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; else npm install --production=false; fi
COPY services/events/src ./src
COPY proto ./proto
EXPOSE 8002
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
