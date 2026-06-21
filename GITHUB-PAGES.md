# GitHub Pages landing site (`github.io`)

**Live URL:** [https://avinashpeyyety.github.io/ollama-chat-app/](https://avinashpeyyety.github.io/ollama-chat-app/)

---

## Fix 404 — enable Pages (one time)

The 404 *"There isn't a GitHub Pages site here"* means Pages is **not enabled** in repo settings. The site files are ready on the `gh-pages` branch.

### Steps

1. Open **[Settings → Pages](https://github.com/avinashpeyyety/ollama-chat-app/settings/pages)**
2. Under **Build and deployment → Source**, select **Deploy from a branch**
3. **Branch:** `gh-pages` · **Folder:** `/ (root)`
4. Click **Save**
5. Wait 1–2 minutes, then refresh the live URL

You should see: *"Your site is live at https://avinashpeyyety.github.io/ollama-chat-app/"*

---

## How updates work

- **Automatic:** pushing to `main` runs `.github/workflows/pages.yml`, which updates the `gh-pages` branch from `docs/`
- **Manual edit:** change `docs/index.html` or `docs/styles.css` on `main`

---

## Custom domain (optional)

**Settings → Pages → Custom domain** → e.g. `ollamachat.io`

DNS:
```
CNAME  ollamachat.io  →  avinashpeyyety.github.io
```