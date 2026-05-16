FROM node:22-alpine

# Install pnpm (v9 is compatible with Node 22 and stable)
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json tsconfig.json ./

# Copy all packages
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/
COPY scripts/ ./scripts/

# Install dependencies (no frozen lockfile to handle overrides mismatch)
RUN pnpm install --no-frozen-lockfile

# Build frontend first, then API server
RUN pnpm --filter @workspace/team-task-manager run build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
