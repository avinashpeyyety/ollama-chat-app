#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

export PATH="$HOME/.local/bin:$PATH"
export OLLAMA_API_BASE="${OLLAMA_API_BASE:-http://127.0.0.1:11434}"
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-30m}"

if ! command -v aider >/dev/null 2>&1; then
  echo "Aider not found. Install:"
  echo "  curl -LsSf https://aider.chat/install.sh | sh"
  read -r -p "Press Enter to exit..." _
  exit 1
fi

if ! curl -sf "${OLLAMA_API_BASE}/api/tags" >/dev/null 2>&1; then
  echo "Ollama is not running. Start it first:"
  echo "  brew services start ollama"
  read -r -p "Press Enter to exit..." _
  exit 1
fi

MODEL="${AIDER_MODEL:-ollama_chat/qwen3.5:9b}"

echo "Starting aider in: $PROJECT_DIR"
echo "Model: $MODEL"
echo ""

exec aider --model "$MODEL" --thinking-tokens 0 --map-tokens 1024 --no-show-model-warnings