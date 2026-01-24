FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ libc6-compat

COPY package*.json ./

RUN npm install --prefer-offline --no-audit && \
    apk del .build-deps && \
    npm cache clean --force && \
    rm -rf /tmp/* ~/.npm /var/cache/apk/*

ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=8080

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
