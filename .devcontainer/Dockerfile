FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
    openssh-client \
    sudo \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node
RUN mkdir /workspaces && chown node:node /workspaces

# Setup pnpm and corepack as root
RUN corepack enable

USER node
RUN mkdir -p ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global

# Initialize git config for lefthook
RUN git config --global user.email "dev@n8n.io" && \
    git config --global user.name "n8n developer"
