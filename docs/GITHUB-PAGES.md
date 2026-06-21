# GitHub Pages landing site

The marketing landing page lives in `website/` and deploys automatically via GitHub Actions.

**Live URL:** [https://avinashpeyyety.github.io/ollama-chat-app/](https://avinashpeyyety.github.io/ollama-chat-app/)

---

## How it works

`.github/workflows/pages.yml` runs on every push to `main`:

1. Uploads `website/` as a Pages artifact
2. Deploys to GitHub Pages

Edit `website/index.html` or `website/styles.css` → push to `main` → site updates in ~1 minute.

---

## One-time repo setting (if Pages doesn't activate)

1. Open [github.com/avinashpeyyety/ollama-chat-app/settings/pages](https://github.com/avinashpeyyety/ollama-chat-app/settings/pages)
2. **Source:** GitHub Actions
3. Save

The workflow handles the rest.

---

## Custom domain (optional)

In **Settings → Pages → Custom domain**, add e.g. `ollamachat.io` and point DNS:

```
CNAME  ollamachat.io  →  avinashpeyyety.github.io
```

---

## Local preview

```bash
cd website
python3 -m http.server 8080
# open http://localhost:8080
```