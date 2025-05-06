FROM node:18-alpine

WORKDIR /app

COPY mcp-server-demo/package.json mcp-server-demo/package-lock.json ./
RUN npm ci
COPY mcp-server-demo/mcp_server.js ./

EXPOSE 3210

CMD node mcp_server.js
