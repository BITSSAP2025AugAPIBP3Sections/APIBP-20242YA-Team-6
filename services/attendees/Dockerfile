FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev
COPY src ./src
EXPOSE 8005
CMD ["node", "src/index.js"]
