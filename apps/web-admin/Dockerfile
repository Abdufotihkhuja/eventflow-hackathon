FROM node:22-alpine AS base

WORKDIR /repo

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --include-workspace-root --workspaces --prefer-offline --no-audit

FROM base AS development

WORKDIR /repo/apps/web-admin

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

FROM base AS production

WORKDIR /repo/apps/web-admin

RUN npm run build
RUN npm install -g serve

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
