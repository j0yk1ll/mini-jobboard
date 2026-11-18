FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && exec node build"]
