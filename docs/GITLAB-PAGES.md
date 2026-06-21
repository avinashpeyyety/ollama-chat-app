# GitLab Pages landing site

The marketing landing page lives in `website/` and is published automatically by GitLab CI.

**Target URL:** `https://avinashpeyyety.gitlab.io/ollama-chat-app/`

---

## One-time GitLab setup

### 1. Create a public GitLab project

1. Go to [gitlab.com/projects/new](https://gitlab.com/projects/new)
2. Project name: `ollama-chat-app`
3. Visibility: **Public**
4. Uncheck "Initialize with a README"

### 2. Push this repo to GitLab

```bash
cd ollama-chat-app
git remote add gitlab git@gitlab.com:avinashpeyyety/ollama-chat-app.git
git push -u gitlab main
```

Or with HTTPS + personal access token:

```bash
git remote add gitlab https://gitlab.com/avinashpeyyety/ollama-chat-app.git
git push -u gitlab main
```

### 3. Enable GitLab Pages

Pages activates automatically when the `pages` CI job succeeds.

1. Go to **Build → Pipelines** — confirm the pipeline on `main` passed
2. Go to **Deploy → Pages** — copy the live URL

### 4. Verify

Open: [https://avinashpeyyety.gitlab.io/ollama-chat-app/](https://avinashpeyyety.gitlab.io/ollama-chat-app/)

---

## How it works

`.gitlab-ci.yml` copies `website/*` into a `public/` artifact. GitLab Pages serves that folder.

Edits to `website/index.html` or `website/styles.css` go live on the next push to `main`.

---

## Custom domain (optional)

In GitLab: **Deploy → Pages → New domain** — point a domain like `ollamachat.io` via DNS CNAME.

---

## GitHub mirror

The app source is also on GitHub: [github.com/avinashpeyyety/ollama-chat-app](https://github.com/avinashpeyyety/ollama-chat-app)

Recommended workflow:
- **GitLab** — landing page (Pages) + optional primary remote
- **GitHub** — source mirror / issues / desktop release artifacts