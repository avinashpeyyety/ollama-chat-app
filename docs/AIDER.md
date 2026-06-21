# Terminal coding with Aider + Ollama

Use [Aider](https://aider.chat) alongside Ollama Chat to edit this repo from the terminal with the same local 9B models — no cloud API keys.

## Install Aider

```bash
curl -LsSf https://aider.chat/install.sh | sh
```

Restart your terminal (or `source ~/.zshrc`) so `~/.local/bin` is on your `PATH`.

Verify:

```bash
aider --version
```

## Start Aider in this project

Aider must run **inside the git repo**, not from your home directory.

**macOS shortcut:** double-click `Start Aider.command` in the project root.

**Shell (from anywhere):**

```bash
cd ollama-chat-app   # your clone path
./scripts/aider-ollama.sh
```

**Optional shell alias** (add to `~/.zshrc`):

```bash
aider-ollama() {
  local project="/path/to/ollama-chat-app"
  cd "$project" || return 1
  ./scripts/aider-ollama.sh "$@"
}
```

## Models

Uses the same Ollama stack as the chat app:

| Model | Aider name | Best for |
|-------|------------|----------|
| Qwen 3.5 9B | `ollama_chat/qwen3.5:9b` | General coding (default) |
| GLM-4 9B | `ollama_chat/glm4:9b` | Faster replies, less “thinking” overhead |

Switch model for one session:

```bash
AIDER_MODEL=ollama_chat/glm4:9b ./scripts/aider-ollama.sh
```

## Performance tips (local 9B)

1. **Pre-warm the model** before starting Aider:
   ```bash
   OLLAMA_KEEP_ALIVE=30m ollama run qwen3.5:9b "ready"
   # Ctrl+D — model stays loaded
   ```
2. **Disable Qwen thinking** in Aider (already set in `Start Aider.command` / `scripts/aider-ollama.sh`): `--thinking-tokens 0`
3. **Smaller repo map** for faster prompts: `--map-tokens 1024`
4. **Scope files** when you know what you're editing:
   ```bash
   ./scripts/aider-ollama.sh public/app.js server.js
   ```
5. **Free RAM** — stop the chat UI while coding: `npm run stop`

First reply after a cold boot can take 1–3 minutes while Ollama loads ~6 GB into memory. Warm follow-ups are typically 5–15 seconds.

## Requirements

- Ollama running (`brew services start ollama` on macOS)
- Models installed (`npm run install-models`)
- Git repo (this project is already initialized)

## Learn more

- [Aider docs](https://aider.chat/docs/)
- [Aider + Ollama](https://aider.chat/docs/llms/ollama.html)