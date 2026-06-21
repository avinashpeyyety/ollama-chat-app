#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

REPO_NAME="${GITHUB_REPO:-ollama-chat-app}"
VISIBILITY="${GITHUB_VISIBILITY:-public}"

echo "==> Project: $PROJECT_DIR"
echo "==> Target:  github.com/$(git config user.name 2>/dev/null || echo USER)/${REPO_NAME} (${VISIBILITY})"

if ! git config user.name >/dev/null 2>&1 || ! git config user.email >/dev/null 2>&1; then
  echo "ERROR: git user.name and user.email must be configured."
  exit 1
fi

if [ ! -d .git ]; then
  git init -b main
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "${COMMIT_MSG:-Ollama Chat: 9B local intelligence app with docs and model installer}"
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if ! gh repo view "${REPO_NAME}" >/dev/null 2>&1; then
    if [ "$VISIBILITY" = "public" ]; then
      gh repo create "${REPO_NAME}" --public --source=. --remote=origin --description "Local HTTPS chat UI for best-in-class 9B Ollama models"
    else
      gh repo create "${REPO_NAME}" --private --source=. --remote=origin --description "Local HTTPS chat UI for best-in-class 9B Ollama models"
    fi
  fi
  gh repo edit "${REPO_NAME}" --visibility "${VISIBILITY}" 2>/dev/null || true
  git push -u origin main
  echo ""
  echo "SUCCESS: $(gh repo view "${REPO_NAME}" --json url -q .url)"
  exit 0
fi

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
  echo "SUCCESS: pushed to origin"
  exit 0
fi

echo ""
echo "Authenticate with GitHub, then re-run:"
echo "  gh auth login"
echo "  bash push-to-github.sh"
echo ""
echo "Or add a remote manually:"
echo "  git remote add origin git@github.com:<username>/${REPO_NAME}.git"
echo "  git push -u origin main"
exit 1