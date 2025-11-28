FROM node:20-alpine
WORKDIR /app
COPY services/tasks/package.json services/tasks/package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev
COPY services/tasks/src ./src
COPY proto ./proto
EXPOSE 8004
CMD ["node", "src/index.js"]
