# STAGE 1: BUILD
FROM node:24-alpine AS build

WORKDIR /client

COPY package*.json /client/

RUN npm ci

COPY . ./

RUN npm run build --configuration=production

# STAGE 2: BOOT
FROM node:24-alpine

ENV PORT=$PORT

COPY --from=build /client/package.json ./
COPY --from=build /client/node_modules ./node_modules
COPY --from=build /client/dist/aircloud/server ./dist

CMD ["sh", "-c", "npm run serve:ssr:aircloud"]
