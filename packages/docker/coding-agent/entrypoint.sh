#!/bin/bash
set -e

echo "=== E2B Coding Agent Startup ==="

# Create Claude Code Router config with runtime API keys
mkdir -p ~/.claude-code-router

cat > ~/.claude-code-router/config.json << CONFIGEOF
{
  "LOG": true,
  "NON_INTERACTIVE_MODE": true,
  "API_TIMEOUT_MS": 600000,
  "Providers": [
    {
      "name": "anthropic",
      "api_base_url": "https://api.anthropic.com/v1/messages",
      "api_key": "${ANTHROPIC_API_KEY}",
      "models": ["claude-opus-4-5-20251101"],
      "transformer": { "use": ["Anthropic"] }
    }
  ],
  "Router": {
    "default": "anthropic,claude-opus-4-5-20251101",
    "think": "anthropic,claude-opus-4-5-20251101"
  }
}
CONFIGEOF

# Create MCP configuration for Figma and Playwright
cat > ~/.mcp.json << MCPEOF
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "${FIGMA_API_KEY}"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
MCPEOF

echo "MCP config created at ~/.mcp.json"

# Configure Claude Code to use the router
export ANTHROPIC_BASE_URL="http://127.0.0.1:${CLAUDE_ROUTER_PORT}"

# Write environment to file for tmux session to source
cat > ~/.agent-env << ENVEOF
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
export ANTHROPIC_BASE_URL="http://127.0.0.1:${CLAUDE_ROUTER_PORT}"
export FIGMA_API_KEY="${FIGMA_API_KEY}"
export GITHUB_TOKEN="${GITHUB_TOKEN}"
export CLAUDE_ROUTER_PORT="${CLAUDE_ROUTER_PORT:-3456}"
export TERM=xterm-256color
ENVEOF

# Configure git to use GITHUB_TOKEN for authentication via gh CLI
if [ -n "${GITHUB_TOKEN}" ]; then
  
  # Configure git to use gh as credential helper
  gh auth setup-git
  
  # Set git user identity for commits
  git config --global user.email "agent@menagerie.local"
  git config --global user.name "Menagerie Agent"
  
  echo "Git/GitHub CLI configured with GITHUB_TOKEN authentication"
fi

echo "Starting Claude Code in tmux session 'agent'..."

# Create tmux session 'agent' and run ccr code inside i, 
# The session sources the env file to get runtime variables
tmux new-session -d -s agent "source ~/.agent-env && ccr code"

echo "Claude Code running in tmux session 'agent'"
echo "Attach with: tmux attach -t agent"

echo "Starting ttyd web terminal on port 3000..."
# ttyd provides web terminal access to the tmux session
# -p 3000: port to listen on
# -W: allow clients to write (interactive mode)
ttyd -p 3000 -W tmux attach -t agent &

echo "ttyd running at http://localhost:3000"

# Keep container alive
tail -f /dev/null