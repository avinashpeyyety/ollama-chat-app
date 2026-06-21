# GitHub Pages landing site (`github.io`)

**Live URL:** [https://avinashpeyyety.github.io/ollama-chat-app/](https://avinashpeyyety.github.io/ollama-chat-app/)

The landing page is in `docs/` (`index.html` + `styles.css`). Markdown docs in the same folder are also published.

---

## One-time setup (required)

1. Open **[github.com/avinashpeyyety/ollama-chat-app/settings/pages](https://github.com/avinashpeyyety/ollama-chat-app/settings/pages)**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. Branch: **`main`** · Folder: **`/docs`**
4. Click **Save**

The site goes live within ~1 minute.

---

## Alternative: GitHub Actions deploy

The repo also includes `.github/workflows/pages.yml`. To use it instead:

1. In **Settings → Pages**, set Source to **GitHub Actions**
2. Re-run the workflow from the **Actions** tab

---

## Edit the landing page

- `docs/index.html` — page content
- `docs/styles.css` — styles

Push to `main` → site updates automatically.

---

## Custom domain (optional)

**Settings → Pages → Custom domain** → e.g. `ollamachat.io`

DNS:
```
CNAME  ollamachat.io  →  avinashpeyyety.github.io
```