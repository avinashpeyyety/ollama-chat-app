import express from "express";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHATS_FILE,
  readChatsFile,
  saveChatsFile,
} from "./lib/chat-storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.MAIN_PORT || 3445;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const EXCLUDED_MODELS = new Set(["qwen:latest"]);

const app = express();
app.use(express.json({ limit: "50mb" }));

app.use((error, _req, res, next) => {
  if (error.type === "request.aborted") {
    if (!res.headersSent) res.status(400).end();
    return;
  }
  next(error);
});

app.get("/api/chats", (_req, res) => {
  res.json(readChatsFile());
});

function saveChatsHandler(req, res) {
  try {
    const saved = saveChatsFile(req.body);
    if (saved.skipped) {
      res.json({ ok: true, count: saved.chats.length, skipped: true });
      return;
    }
    res.json({ ok: true, count: saved.chats.length, savedAt: saved.savedAt });
  } catch (error) {
    res.status(500).json({ error: "Failed to save chats", detail: error.message });
  }
}

app.put("/api/chats", saveChatsHandler);
app.post("/api/chats", saveChatsHandler);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    chatsApi: true,
    storage: CHATS_FILE,
    pid: process.pid,
    port: Number(PORT),
  });
});

app.get("/api/models", async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }
    const data = await response.json();
    const models = (data.models || []).filter((item) => !EXCLUDED_MODELS.has(item.name));
    res.json({ ...data, models });
  } catch (error) {
    res.status(502).json({
      error: "Could not reach Ollama. Make sure it is running: brew services start ollama",
      detail: error.message,
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text });
      return;
    }

    const contentType = response.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(502).json({
        error: "Could not reach Ollama. Make sure it is running: brew services start ollama",
        detail: error.message,
      });
    } else {
      res.end();
    }
  }
});

app.use(express.static(path.join(__dirname, "public"), {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

const keyPath = path.join(__dirname, "certs", "key.pem");
const certPath = path.join(__dirname, "certs", "cert.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("SSL certificates not found. Run: npm run setup");
  process.exit(1);
}

https.createServer(
  {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
  app
).listen(PORT, () => {
  console.log(`Chat server running on https://127.0.0.1:${PORT}`);
  console.log(`Chat storage: ${CHATS_FILE}`);
});