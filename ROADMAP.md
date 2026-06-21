# Roadmap

Improvements aligned with the goal: **best-in-class local intelligence in the 9B parameter paradigm**.

---

## Near term

### Model curation
- [ ] Curated model presets (Fast / Balanced / Vision / Code)
- [ ] Auto-detect hardware (RAM/VRAM) and recommend quant levels (Q4_K_M vs Q8)
- [ ] Model health check on startup (verify `qwen3.5:9b` and `glm4:9b` are pulled)
- [ ] One-click `ollama pull` from the UI when a model is missing

### Chat experience
- [ ] Markdown rendering in responses (code blocks, lists, links)
- [ ] Copy button per message
- [ ] Side-by-side layout for **all models** mode (columns instead of stacked)
- [ ] Response latency badge per model
- [ ] Regenerate / continue from last message

### Reliability
- [ ] macOS `launchd` plist for auto-start on login
- [ ] Windows service / tray app for background running
- [ ] Automatic Ollama connectivity check with guided fix
- [ ] Backup/restore chat history export (JSON)

---

## Medium term

### Intelligence features
- [ ] **Model arbiter** — after parallel run, optional summary picking the best answer
- [ ] RAG over local folders (index documents, query with 9B embed model)
- [ ] System prompt templates (coder, writer, analyst)
- [ ] Per-model temperature and context length controls

### 9B ecosystem expansion
- [ ] Support additional 9B-class models as optional plugins:
  - Mistral 7B/9B variants
  - Llama 3.1 8B
  - DeepSeek-R1 distill 7B/8B
- [ ] Benchmark mode: fixed prompt suite scored across models

### UI/UX
- [ ] Light theme
- [ ] Keyboard shortcuts (new chat, focus input, toggle think)
- [ ] Search across chat history
- [ ] Drag-and-drop file attach

---

## Long term

### Desktop distribution
- [ ] Electron or Tauri wrapper (see [DISTRIBUTION.md](./DISTRIBUTION.md))
- [ ] Signed macOS `.dmg` and Windows `.exe` installers
- [ ] Bundled Ollama installer + model download wizard
- [ ] Auto-update channel

### Public presence
- [ ] Landing page on a `.io` domain (e.g. `ollamachat.io`)
- [ ] Download page with checksums and release notes
- [ ] Docs site with hardware sizing guide for 9B models

### Advanced local stack
- [ ] GPU utilization indicator
- [ ] Model hot-swap without restart
- [ ] Conversation branching
- [ ] Plugin/tool-use UI for models that support function calling

---

## Non-goals (for now)

- Cloud-hosted inference (defeats the local-first purpose)
- Training or fine-tuning inside the app
- Models above ~14B as defaults (stays focused on the 9B paradigm)