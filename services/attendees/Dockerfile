FROM node:20-alpine
WORKDIR /app
COPY services/attendees/package.json services/attendees/package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev
COPY services/attendees/src ./src
COPY proto ./proto
EXPOSE 8005
CMD ["node", "src/index.js"]
