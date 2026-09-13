FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY index.js .
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 4001
CMD ["node", "index.js"]
