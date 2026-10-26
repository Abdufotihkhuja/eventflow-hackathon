FROM node:22-alpine AS base

WORKDIR /repo

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --include-workspace-root --workspaces --prefer-offline --no-audit

FROM base AS development

WORKDIR /repo/apps/web-public

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

FROM base AS production

WORKDIR /repo/apps/web-public

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
