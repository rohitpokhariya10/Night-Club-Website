FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost/build npm run db:generate
FROM base AS api
RUN npm run build -w @jimmy/api
USER node
EXPOSE 4000
CMD ["npm","run","start","-w","@jimmy/api"]
FROM base AS web
ARG NEXT_PUBLIC_SITE_URL
ARG INDEXING_ENABLED=false
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL INDEXING_ENABLED=$INDEXING_ENABLED API_URL=http://api:4000
RUN npm run build -w @jimmy/web && chown -R node:node /app/apps/web/.next
USER node
EXPOSE 3000
CMD ["npm","run","start","-w","@jimmy/web"]
