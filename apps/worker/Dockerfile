FROM node:22-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_AUDIT=false

COPY package*.json ./
RUN for attempt in 1 2 3 4 5; do npm install --prefer-offline --no-audit && break; if [ "$attempt" = 5 ]; then exit 1; fi; echo "npm install failed, retrying in 15s... ($attempt/5)"; sleep 15; done

COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_AUDIT=false

COPY package*.json ./
RUN for attempt in 1 2 3 4 5; do npm install --omit=dev --prefer-offline --no-audit && break; if [ "$attempt" = 5 ]; then exit 1; fi; echo "npm install failed, retrying in 15s... ($attempt/5)"; sleep 15; done

COPY --from=builder /app/dist ./dist

CMD ["npm", "run", "start:prod"]

FROM node:22-alpine AS development

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_AUDIT=false

COPY package*.json ./
RUN for attempt in 1 2 3 4 5; do npm install --prefer-offline --no-audit && break; if [ "$attempt" = 5 ]; then exit 1; fi; echo "npm install failed, retrying in 15s... ($attempt/5)"; sleep 15; done

COPY . .

CMD ["npm", "run", "start"]
