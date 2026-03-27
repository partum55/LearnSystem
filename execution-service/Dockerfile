FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# ==========================================
# 1. System dependencies
# ==========================================
RUN apt-get update && apt-get install -y \
    curl wget git make gcc pkg-config \
    libcap-dev libsystemd-dev \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# ==========================================
# 2. Isolate sandbox
# ==========================================
RUN git clone https://github.com/ioi/isolate /tmp/isolate \
    && cd /tmp/isolate \
    && make install \
    && rm -rf /tmp/isolate \
    && isolate --version

# ==========================================
# 3. Python 3.14
# ==========================================
RUN add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y \
       python3.14 python3.14-dev python3.14-venv \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.14

RUN python3.14 -m pip install --no-cache-dir \
    pytest \
    pylint \
    pytest-json-report \
    fastapi \
    pydantic

# ==========================================
# 4. Java 21
# ==========================================
RUN apt-get update && apt-get install -y \
    openjdk-21-jdk maven \
    && rm -rf /var/lib/apt/lists/*

RUN java -version && mvn -version

# ==========================================
# 5. Node.js 24 LTS
# ==========================================
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g jest@29 \
    && rm -rf /var/lib/apt/lists/*

RUN node --version && jest --version

# ==========================================
# 6. GCC 13 with C++20 support
# ==========================================
RUN apt-get update && apt-get install -y \
    g++-13 cmake libgtest-dev \
    && rm -rf /var/lib/apt/lists/*

RUN cd /usr/src/googletest \
    && cmake . \
    && make \
    && make install

RUN update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-13 100 \
    && g++ --version

# ==========================================
# 7. Extra JARs
# ==========================================
RUN wget -q https://projectlombok.org/downloads/lombok.jar \
    -O /opt/lombok.jar

RUN wget -q https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/1.11.3/junit-platform-console-standalone-1.11.3.jar \
    -O /opt/junit.jar

# ==========================================
# Application
# ==========================================
WORKDIR /app
COPY . .

EXPOSE 3000

CMD ["python3.14", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
