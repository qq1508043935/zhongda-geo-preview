FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
ENV HOST=0.0.0.0 PORT=8080 DATA_DIR=/app-data/leads
RUN mkdir -p /app-data/leads && chown -R node:node /app-data
USER node
EXPOSE 8080
CMD ["node", "server.js"]
