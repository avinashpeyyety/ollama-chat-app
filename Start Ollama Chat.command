#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Install: brew install ollama"
  read -r -p "Press Enter to exit..." _
  exit 1
fi

if ! ollama list 2>/dev/null | grep -q "qwen3.5:9b\|glm4:9b"; then
  echo "Recommended 9B models not found. Running installer..."
  npm run install-models
fi

echo "Starting Ollama Chat..."
npm run restart-and-test

echo ""
echo "Opening https://localhost:3443"
open "https://localhost:3443"

echo ""
echo "Server is running. You can close this window."
read -r -p "Press Enter to stop the server and exit... " _

npm run stop
echo "Stopped."