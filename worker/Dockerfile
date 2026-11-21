# Playwright's official image already contains Chromium and its system dependencies.
FROM mcr.microsoft.com/playwright:v1.48.2-jammy
WORKDIR /app
RUN npm init -y >/dev/null && npm i playwright-core@1.48.2
COPY betpawa-worker.mjs .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "betpawa-worker.mjs"]
