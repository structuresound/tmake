FROM node:6-slim
MAINTAINER chroma <leif@chroma.io>

RUN apt-get update \
    && apt-get install -y \
    build-essential \
    git \
    bzip2 \
    ca-certificates \
    curl \
    file \
    git \
    gzip \
    libcurl4-openssl-dev \
    libssl-dev \
    make \
    pkg-config \
    rsync \
    sed \
    tar \
    wget \
    xz-utils \
    && apt-get -y clean

WORKDIR /usr/src
RUN git clone https://github.com/Kitware/CMake.git CMake && \
    cd CMake && \
    git checkout v3.4.3 && \
    cd .. && mkdir CMake-build && cd CMake-build && \
    /usr/src/CMake/bootstrap \
      --parallel=$(nproc) \
      --prefix=/usr && \
    make -j$(nproc) && \
    ./bin/cmake -DCMAKE_USE_SYSTEM_CURL:BOOL=ON \
      -DCMAKE_BUILD_TYPE:STRING=Release \
      -DCMAKE_USE_OPENSSL:BOOL=ON . && \
    make install && \
    cd .. && \
    rm -rf CMake*
