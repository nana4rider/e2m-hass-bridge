FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json build.js ./
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
COPY --chown=node:node --from=build /app/package*.json ./
COPY --chown=node:node --from=build /app/dist dist

USER node
EXPOSE 3000

ENTRYPOINT ["node", "dist/index"]
