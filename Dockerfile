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
COPY scripts/migrate.mjs scripts/seed-demo.mjs ./scripts/
USER node
EXPOSE 3000
CMD ["sh", "-ec", "npm run db:migrate; if [ \"$SEED_DEMO\" = 1 ]; then node scripts/seed-demo.mjs; fi; exec node build"]
