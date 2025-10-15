FROM node:18-slim

WORKDIR /usr/src/app

# Install dependencies (no lockfile needed)
COPY package.json ./
RUN npm install --omit=dev

# Copy app
COPY . .

ENV PORT=8080
EXPOSE 8080

# Optional container health check; Cloud Run can also healthcheck /healthz
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
