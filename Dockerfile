FROM python:3.12-slim-bookworm AS python-deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    "Pillow==11.1.0" \
    "opencv-python-headless==4.11.0.86" \
    "yt-dlp==2026.11.23" \
    "pilmoji @ git+https://github.com/jay3332/pilmoji.git"

RUN git clone --depth 1 \
    https://github.com/brahdee/pycaption.git \
    /opt/pycaption

FROM node:26-bookworm-slim AS pnpm-base

COPY --from=ghcr.io/pnpm/pnpm:12.21.0 /opt/pnpm /opt/pnpm

RUN for bin in pnpm pn pnpx pnx; do \
    ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; \
    done

WORKDIR /app

# build typescript
FROM pnpm-base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# install dependencies
FROM pnpm-base AS production-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

# production runtime
FROM node:26-bookworm-slim AS production

ARG GIT_COMMIT
ARG GIT_COMMIT_COUNT
ARG GIT_TIMESTAMP
ARG GIT_MESSAGE

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYCAPTION_DIR=/opt/pycaption \
    CADE_GIT_COMMIT=${GIT_COMMIT} \
    CADE_GIT_COMMIT_COUNT=${GIT_COMMIT_COUNT} \
    CADE_GIT_TIMESTAMP=${GIT_TIMESTAMP} \
    CADE_GIT_MESSAGE=${GIT_MESSAGE}

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        ffmpeg \
        imagemagick \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=python-deps /usr/local /usr/local
COPY --from=python-deps /opt/pycaption /opt/pycaption

COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

COPY --from=build --chown=node:node /app/drizzle ./drizzle

RUN python3 --version \
    && python3 -c "import PIL, cv2, numpy; from pilmoji import Pilmoji" \
    && yt-dlp --version \
    && ffmpeg -version >/dev/null \
    && convert -version >/dev/null \
    && node --version

USER node

CMD ["node", "dist/index.js"]
