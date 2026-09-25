FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY index.js .
USER node
EXPOSE 4007
CMD ["node", "--require", "@opentelemetry/auto-instrumentations-node/register", "index.js"]