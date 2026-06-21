#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "==> Project: $PROJECT_DIR"

# Verify git identity
if ! git config user.name >/dev/null 2>&1 || ! git config user.email >/dev/null 2>&1; then
  echo "ERROR: git user.name and user.email must be configured."
  echo "Run: git config --global user.name \"Your Name\""
  echo "Run: git config --global user.email \"you@example.com\""
  exit 1
fi

echo "==> Git user: $(git config user.name) <$(git config user.email)>"

# Initialize repo if needed
if [ ! -d .git ]; then
  echo "==> Initializing git repository..."
  git init -b main
else
  echo "==> Git repository already initialized"
fi

# Stage and commit
echo "==> Staging files (respecting .gitignore)..."
git add -A
if git diff --cached --quiet; then
  echo "==> No changes to commit (already up to date)"
else
  git commit -m "Initial commit: Ollama HTTPS chat app"
  echo "==> Committed files:"
  git show --name-only --pretty=format: HEAD | sed '/^$/d'
fi

# Try glab first
if command -v glab >/dev/null 2>&1; then
  echo "==> glab found: $(which glab)"
  if glab auth status >/dev/null 2>&1; then
    echo "==> Creating private GitLab repo and pushing via glab..."
    glab repo create ollama-chat-app \
      --public \
      --source=. \
      --remote=origin \
      --push \
      --description "Local HTTPS chat UI for best-in-class 9B Ollama models"
    echo ""
    echo "SUCCESS: Pushed to GitLab"
    glab repo view --web=false 2>/dev/null || git remote get-url origin
    exit 0
  else
    echo "WARN: glab is installed but not authenticated."
    echo "Run: glab auth login"
  fi
else
  echo "WARN: glab CLI not found."
  echo "Install: brew install glab"
fi

# Fallback: GitLab API with token
if [ -n "${GITLAB_TOKEN:-}" ] || [ -n "${GITLAB_PRIVATE_TOKEN:-}" ]; then
  TOKEN="${GITLAB_TOKEN:-${GITLAB_PRIVATE_TOKEN}}"
  HOST="${GITLAB_HOST:-gitlab.com}"
  NAMESPACE="${GITLAB_NAMESPACE:-}"

  if [ -z "$NAMESPACE" ]; then
    echo "==> Fetching GitLab username..."
    NAMESPACE=$(curl -s --header "PRIVATE-TOKEN: $TOKEN" "https://${HOST}/api/v4/user" | python3 -c "import sys,json; print(json.load(sys.stdin)['username'])")
  fi

  echo "==> Creating private repo via GitLab API (${HOST}/${NAMESPACE}/ollama-chat-app)..."
  curl -s --request POST \
    --header "PRIVATE-TOKEN: $TOKEN" \
    --header "Content-Type: application/json" \
    --data '{"name":"ollama-chat-app","visibility":"public","description":"Local HTTPS chat UI for best-in-class 9B Ollama models"}' \
    "https://${HOST}/api/v4/projects" >/dev/null

  REMOTE="git@${HOST}:${NAMESPACE}/ollama-chat-app.git"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "$REMOTE"
  fi

  echo "==> Pushing to origin main..."
  git push -u origin main
  echo ""
  echo "SUCCESS: https://${HOST}/${NAMESPACE}/ollama-chat-app"
  exit 0
fi

echo ""
echo "FAILED: Could not push automatically."
echo ""
echo "Authentication required. Choose one option:"
echo ""
echo "Option A — glab (recommended):"
echo "  brew install glab"
echo "  glab auth login"
echo "  cd \"$PROJECT_DIR\""
echo "  glab repo create ollama-chat-app --private --source=. --remote=origin --push"
echo ""
echo "Option B — Personal Access Token:"
echo "  export GITLAB_TOKEN=<your-token>"
echo "  export GITLAB_NAMESPACE=<your-gitlab-username>   # optional if token can resolve user"
echo "  bash \"$PROJECT_DIR/push-to-gitlab.sh\""
echo ""
echo "Option C — Manual:"
echo "  1. Create private repo 'ollama-chat-app' at https://gitlab.com/projects/new"
echo "  2. git remote add origin git@gitlab.com:<username>/ollama-chat-app.git"
echo "  3. git push -u origin main"
exit 1