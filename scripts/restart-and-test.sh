#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== Step 1: Kill supervisor (3443) and chat server (3445) ==="
for PORT in 3443 3445 3444; do
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Killing PIDs on :$PORT: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
  else
    echo "No process on port $PORT"
  fi
done

echo ""
echo "=== Step 2: Start supervisor (serves UI on 3443, chat on 3445) ==="
npm start &
SERVER_PID=$!
echo "Started npm start (PID $SERVER_PID)"

echo ""
echo "=== Step 3: Wait for chat server ==="
for i in {1..30}; do
  if curl -sk --connect-timeout 1 https://localhost:3443/api/health >/dev/null 2>&1; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Server did not become ready in 30s"
    echo "Check server.log in the project folder"
    exit 1
  fi
done

echo ""
echo "=== Step 4: GET /api/health ==="
HEALTH=$(curl -sk -w "\nHTTP_STATUS:%{http_code}" https://localhost:3443/api/health)
echo "$HEALTH"

echo ""
echo "=== Step 5: GET /api/control/status ==="
CONTROL=$(curl -sk -w "\nHTTP_STATUS:%{http_code}" https://localhost:3443/api/control/status)
echo "$CONTROL"

echo ""
echo "=== Step 6: PUT /api/chats ==="
PUT=$(curl -sk -w "\nHTTP_STATUS:%{http_code}" -X PUT https://localhost:3443/api/chats \
  -H "Content-Type: application/json" \
  -d '{"activeChatId":null,"chats":[]}')
echo "$PUT"