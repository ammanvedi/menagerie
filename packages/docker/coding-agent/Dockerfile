# ANTHROPIC_API_KEY
# FIGMA_API_KEY
# GITHUB_TOKEN

# -----------------------------------------------------------------------------
# Base Image
# -----------------------------------------------------------------------------
# Using Node 20 on Debian Bookworm for E2B compatibility
# E2B only supports Debian-based images (Debian, Ubuntu, or e2bdev images)
FROM node:20-bookworm

# -----------------------------------------------------------------------------
# System Dependencies
# -----------------------------------------------------------------------------
# Install essential tools and Playwright dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    ca-certificates \
    build-essential \
    python3 \
    tmux \
    && rm -rf /var/lib/apt/lists/*

# Install ttyd (web terminal) from GitHub releases
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then TTYD_ARCH="x86_64"; else TTYD_ARCH="aarch64"; fi && \
    wget -q "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${TTYD_ARCH}" -O /usr/local/bin/ttyd && \
    chmod +x /usr/local/bin/ttyd

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Node Package Manager Setup
# -----------------------------------------------------------------------------
# Enable corepack for pnpm support
RUN corepack enable && corepack prepare pnpm@latest --activate

# Update npm to latest
RUN npm install -g npm@latest

# -----------------------------------------------------------------------------
# Global npm Packages
# -----------------------------------------------------------------------------
# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install Claude Code Router for request routing
RUN npm install -g @musistudio/claude-code-router

# Install MCP servers globally
RUN npm install -g figma-developer-mcp @playwright/mcp

# ttyd is installed from GitHub releases in system dependencies section

# Install Playwright library
RUN npx -y playwright install --with-deps

# -----------------------------------------------------------------------------
# Playwright Browser Installation
# -----------------------------------------------------------------------------
# Install Chromium with all dependencies
# Only installing Chromium to reduce image size (~400MB vs ~1.5GB for all browsers)
RUN npx playwright install --with-deps chromium

# -----------------------------------------------------------------------------
# Working Directory and User Setup
# -----------------------------------------------------------------------------
# Create user home directory structure
RUN mkdir -p /home/user && chown -R node:node /home/user

# Create Claude Code Router configuration directory
RUN mkdir -p /home/user/.claude-code-router && chown -R node:node /home/user/.claude-code-router

# Create workspace directory
RUN mkdir -p /home/user/workspace && chown -R node:node /home/user/workspace

# Set working directory
WORKDIR /home/user/workspace

# -----------------------------------------------------------------------------
# Environment Defaults
# -----------------------------------------------------------------------------
# Set sensible defaults (can be overridden at runtime)
ENV NODE_ENV=development
ENV CLAUDE_ROUTER_PORT=3456
ENV HOME=/home/user
ENV PATH="/home/user/.local/bin:${PATH}"

# -----------------------------------------------------------------------------
# Exposed Ports
# -----------------------------------------------------------------------------
# ttyd web terminal
EXPOSE 3000
# Claude Code Router (internal API proxy)
EXPOSE 3456
# Common dev server ports (for apps the agent may run)
EXPOSE 5173 5174 8080 8000 4200

# -----------------------------------------------------------------------------
# Entrypoint Script
# -----------------------------------------------------------------------------
# Copy entrypoint script (uses runtime env vars from Sandbox.create)
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Run entrypoint at startup (has access to runtime env vars from Sandbox.create)
CMD ["/usr/local/bin/entrypoint.sh"]
