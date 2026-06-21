# Distribution plan

How to ship Ollama Chat as a **desktop app** and promote it on a **`.io` landing page**.

---

## Can this be a Mac and Windows executable?

**Yes.** The app is a Node.js server + static web UI, so it can be packaged for desktop. It cannot run as a pure static website because it needs a local process talking to Ollama.

### Recommended approach: Tauri or Electron

| Approach | Pros | Cons |
|----------|------|------|
| **Tauri 2** | Small binaries, native WebView, Rust shell | More setup; Ollama still separate |
| **Electron** | Mature ecosystem, easy Node embedding | Larger download (~150 MB+) |
| **pkg / nexe** | Single Node binary | Fragile with native modules; no tray UI |

**Recommendation:** **Electron + electron-builder** for v1 desktop releases.

### What the installer would bundle

1. **Ollama Chat** (Node runtime + app code + certs generator)
2. **Setup wizard** on first launch:
   - Check/install Ollama
   - Run `ollama pull qwen3.5:9b` and `ollama pull glm4:9b`
   - Generate TLS certs
   - Open `https://localhost:3443`
3. **Tray icon** (menu: Open, Restart, Quit)
4. **Auto-start option** (login item / Windows startup)

### Build targets

```text
macOS   →  Ollama Chat.dmg  (universal or arm64)
Windows →  Ollama Chat Setup.exe  (NSIS installer)
```

### electron-builder sketch

```json
{
  "build": {
    "appId": "io.ollamachat.app",
    "productName": "Ollama Chat",
    "mac": { "target": "dmg", "category": "public.app-category.productivity" },
    "win": { "target": "nsis" },
    "files": ["control-server.js", "server.js", "lib/**", "public/**", "scripts/**"]
  }
}
```

The main process would spawn `control-server.js` and open the system browser (or an embedded `BrowserWindow`).

---

## Can it be published on a `.io` page?

**Partially — two different things:**

### 1. Landing / marketing site (`.io` domain) — **Yes**

A domain like `ollamachat.io` can host:

- Product overview and the 9B local intelligence mission
- Download links for Mac `.dmg` and Windows `.exe`
- Install docs and hardware requirements
- Changelog and GitHub link

**Hosting options:**
- [Cloudflare Pages](https://pages.cloudflare.com) — free, fast, custom domain
- [GitHub Pages](https://pages.github.com) — free, `CNAME` to `ollamachat.io`
- [Vercel](https://vercel.com) — free tier for static sites

This site is **marketing only** — not the chat app itself.

### 2. Running the chat app from the `.io` URL — **No**

The chat app must run **locally** because:

- Ollama listens on `127.0.0.1:11434`
- Browsers cannot call Ollama from a remote website (CORS + security)
- Chat history is stored on the local filesystem

The `.io` page directs users to **download and install** the desktop app.

---

## Suggested release pipeline

```text
git tag v1.0.0
  → GitHub Actions
    → npm ci && npm test
    → electron-builder (mac + win)
    → upload artifacts to GitHub Releases
    → update ollamachat.io download links
```

### GitHub Actions matrix (future)

```yaml
strategy:
  matrix:
    os: [macos-latest, windows-latest]
steps:
  - run: npm ci
  - run: npm run build:desktop
  - uses: softprops/action-gh-release@v2
```

---

## First-time install flow (desktop)

```text
User downloads installer
  → Install app to /Applications or Program Files
  → First launch wizard:
      1. "Install Ollama?" → open ollama.com or brew/choco
      2. "Download models (~12 GB)?" → pull qwen3.5:9b + glm4:9b
      3. "Generate certificates" → npm run setup
      4. "Launch" → open https://localhost:3443
```

The current `npm run setup:full` script is the CLI equivalent of this wizard.

---

## Domain checklist

- [ ] Register domain (e.g. `ollamachat.io` on Namecheap, Cloudflare Registrar)
- [ ] DNS → Cloudflare Pages or GitHub Pages
- [ ] Static landing page repo (`ollamachat-website`)
- [ ] GitHub Releases for binaries
- [ ] Code signing (Apple Developer ID, Windows Authenticode) for trusted installs