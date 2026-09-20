FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    xz-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://deno.land/install.sh | sh && \
    ${DENO_INSTALL}/bin/deno upgrade --canary

WORKDIR /workspace

COPY assets/icon.ico ./assets/icon.ico
COPY dist/build/index.js ./bundle.js

ARG CACHE_BUST=1
ARG DENO_FLAGS=""

RUN mkdir -p /out && \
    deno compile \
      --allow-all \
      --no-check \
      --unsafely-ignore-certificate-errors \
      --target x86_64-pc-windows-msvc \
      --engine quickjs \
      --icon assets/icon.ico \
      $DENO_FLAGS \
      --output /out/raf-launcher.exe \
      bundle.js

CMD ["sh", "-c", "cp /out/raf-launcher.exe /dist/raf-launcher.exe"]
