# Dockerfile optimized for development and production
FROM node:24-alpine AS base

RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

FROM base AS dependencies

RUN yarn install --frozen-lockfile --non-interactive \
  && yarn cache clean

FROM dependencies AS build

COPY . .

RUN yarn build

FROM dependencies AS development

RUN apk add --no-cache netcat-openbsd

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN chown -R node:node /usr/src/app

USER node

EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["yarn", "run", "start:dev"]

FROM base AS production

ENV NODE_ENV=production

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package.json ./

RUN chown -R node:node /usr/src/app

USER node

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["yarn", "run", "start:prod"]
