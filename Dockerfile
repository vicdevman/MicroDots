# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@12.11.2 --activate

WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apk add --no-cache su-exec

WORKDIR /app

COPY --from=build /app /app
COPY deploy/entrypoint.sh /usr/local/bin/microdots-entrypoint

RUN chmod 0755 /usr/local/bin/microdots-entrypoint \
  && mkdir -p /data/secrets /data/artifacts /workspaces \
  && chown -R node:node /data /workspaces

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/microdots-entrypoint"]
CMD ["node", "apps/server/dist/index.js"]
