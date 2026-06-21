# Ollama Chat

A local HTTPS chat app for running **best-in-class ~9B parameter models** on your own machine — optimized for practical local intelligence without cloud dependency.

**Live locally at:** [https://localhost:3443](https://localhost:3443)

---

## Project goal

This project exists to make **local AI chat feel as capable as cloud assistants**, while staying entirely on your hardware.

The target is the **9B parameter sweet spot**: models large enough for strong reasoning, coding, and multimodal tasks, but small enough to run comfortably on a modern laptop or desktop with acceptable latency and memory use.

### Default model stack

| Model | Role | Why |
|-------|------|-----|
| **Qwen 3.5 9B** (`qwen3.5:9b`) | Primary general + vision + tools | Strong all-rounder with thinking and image support |
| **GLM-4 9B** (`glm4:9b`) | Alternate reasoning style | Complementary Chinese-English bilingual model at the same scale |

Together these form a **dual-model 9B bench** you can query individually or **in parallel** via the **all models** dropdown option.

### Design principles

1. **Local-first** — Ollama on `localhost`, no API keys, no data leaving your machine
2. **HTTPS even locally** — self-signed TLS for a production-like browser environment
3. **Persistent history** — disk + browser storage with merge and recovery
4. **Honest about hardware** — 9B models, not 70B fantasies on a MacBook
5. **Compare, don't guess** — run all models at once when you want the best answer

---

## Features

- Model picker with **all models** parallel mode
- Streaming responses with **per-model labels** in chat
- File attachments (text + images for vision models)
- Think-mode toggle for supported models
- Chat history with disk persistence (`~/Library/Application Support/ollama-chat-app/` on macOS)
- Server start/stop/restart from the sidebar
- Supervisor stays up when the chat server restarts

---

## Requirements

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **Ollama** ([ollama.com](https://ollama.com))
- **OpenSSL** (pre-installed on macOS; included with Git on Windows)

---

## Installation

### 1. Clone and install dependencies

```bash
git clone https://github.com/avinashpeyyety/ollama-chat-app.git
cd ollama-chat-app
npm install
```

`npm install` automatically generates local TLS certificates.

### 2. Install Ollama (if not already installed)

**macOS:**
```bash
brew install ollama
brew services start ollama
```

**Windows:** Download the installer from [ollama.com/download](https://ollama.com/download) and run it.

### 3. Pull the recommended 9B models

```bash
npm run install-models
```

This downloads:
- `qwen3.5:9b` (~6.6 GB)
- `glm4:9b` (~5.5 GB)

Or run the full first-time setup in one step:

```bash
npm run setup:full
```

### 4. Start the app

```bash
npm start
```

Open **https://localhost:3443** (accept the self-signed certificate warning).

**macOS shortcut:** double-click `Start Ollama Chat.command`

**Windows shortcut:** double-click `Start Ollama Chat.bat`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start supervisor + chat server |
| `npm run stop` | Stop all servers |
| `npm run setup` | Generate TLS certificates |
| `npm run install-models` | Pull Qwen 3.5 9B and GLM-4 9B via Ollama |
| `npm run setup:full` | Certs + model install + dependency check |
| `npm run restart-and-test` | Kill ports, restart, smoke-test APIs |

---

## Architecture

```
Browser  →  https://localhost:3443   (supervisor / UI)
                ↓ proxy
           https://127.0.0.1:3445   (chat API + persistence)
                ↓
           http://127.0.0.1:11434   (Ollama)
```

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for planned improvements.

## Distribution

See [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) for desktop executables (Mac/Windows) and `.io` landing page plans.

---

## License

MIT