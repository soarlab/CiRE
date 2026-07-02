FROM ubuntu:22.04 AS explorer-builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY . ./
RUN npm run webpack

FROM ubuntu:22.04 AS alive2-builder

ENV DEBIAN_FRONTEND=noninteractive

ARG ALIVE2_REPO=https://github.com/AliveToolkit/alive2.git
ARG ALIVE2_REF=v21.0
ARG LLVM_VERSION=21

RUN apt-get update && apt-get install -y \
    build-essential \
    ca-certificates \
    cmake \
    git \
    gnupg \
    ninja-build \
    lsb-release \
    software-properties-common \
    python3 \
    re2c \
    wget \
    z3 \
    libz3-dev \
    zlib1g-dev \
    libzstd-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
RUN wget -q https://apt.llvm.org/llvm.sh && \
    chmod +x llvm.sh && \
    ./llvm.sh "${LLVM_VERSION}" all

WORKDIR /build
RUN if [ -n "${ALIVE2_REF}" ]; then \
        git clone --depth 1 --branch "${ALIVE2_REF}" "${ALIVE2_REPO}" alive2; \
    else \
        git clone --depth 1 "${ALIVE2_REPO}" alive2; \
    fi

WORKDIR /build/alive2

RUN mkdir -p build-new && cd build-new && \
    cmake .. \
        -G Ninja \
        -DBUILD_TV=1 \
        -DBUILD_LLVM_UTILS=1 \
        -DLLVM_DIR=/usr/lib/llvm-21/lib/cmake/llvm \
        -DCMAKE_BUILD_TYPE=Release \
        && \
    ninja -j2 && \
    ninja install

FROM docker.io/caydenlund/cire:latest

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y \
    nodejs \
    z3 \
    libz3-dev \
    libedit2 \
    libxml2 \
    binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=explorer-builder /app /app
COPY --from=explorer-builder /app/out/dist/manifest.json /app/manifest.json
COPY --from=explorer-builder /app/out/webpack/static/ /app/static/
COPY --from=alive2-builder /usr/local/bin/alive-tv /usr/local/bin/alive-tv
COPY --from=alive2-builder /usr/lib/llvm-21 /usr/lib/llvm-21
COPY --from=alive2-builder /usr/lib/x86_64-linux-gnu/libLLVM.so.21.1 /usr/lib/x86_64-linux-gnu/libLLVM.so.21.1

RUN chmod +x /usr/local/bin/alive-tv

ENV NODE_ENV=production
ENV PATH="/usr/local/bin:${PATH}"
ENV LD_LIBRARY_PATH="/usr/lib/llvm-21/lib:${LD_LIBRARY_PATH}"

EXPOSE 10240
ENTRYPOINT []

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:10240/ || exit 1

CMD ["node", "--no-warnings=ExperimentalWarning", "--import=tsx", "app.ts"]
