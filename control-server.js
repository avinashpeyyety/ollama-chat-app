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
import {
  USER_PORT,
  MAIN_PORT,
  getControlStatus,
  isPortInUse,
  restartMainServer,
  startMainServer,
  stopMainServer,
  waitForMainServer,
} from "./lib/process-control.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();
const jsonParser = express.json({ limit: "50mb" });

function proxyToMain(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${MAIN_PORT}` };
  delete headers.connection;

  const proxyReq = https.request(
    {
      hostname: "127.0.0.1",
      port: MAIN_PORT,
      path: req.originalUrl,
      method: req.method,
      headers,
      rejectUnauthorized: false,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    if (!res.headersSent) {
      res.status(502).json({
        error: "Chat server unavailable",
        detail: error.message,
        main: { running: false },
      });
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq);
}

function mainIsRunning() {
  return isPortInUse(MAIN_PORT);
}

app.get("/api/control/status", (_req, res) => {
  res.json(getControlStatus());
});

app.post("/api/control/start", async (_req, res) => {
  const result = await startMainServer();
  const ready = result.alreadyRunning || (result.started && (await waitForMainServer(15)));
  res.json({ ...result, ready, status: getControlStatus() });
});

app.post("/api/control/stop", (_req, res) => {
  const result = stopMainServer();
  res.json({ ...result, status: getControlStatus() });
});

app.post("/api/control/restart", async (_req, res) => {
  const result = await restartMainServer();
  const ready = await waitForMainServer(15);
  res.json({ ...result, ready, status: getControlStatus() });
});

app.post("/api/server/ensure-control", (_req, res) => {
  res.json({ ok: true, running: true, status: getControlStatus() });
});

function handleOfflineChatPersistence(req, res) {
  if (req.path === "/api/chats" && req.method === "GET") {
    res.json(readChatsFile());
    return true;
  }

  if (req.path === "/api/chats" && (req.method === "PUT" || req.method === "POST")) {
    try {
      const saved = saveChatsFile(req.body);
      if (saved.skipped) {
        res.json({ ok: true, count: saved.chats.length, skipped: true });
        return true;
      }
      res.json({ ok: true, count: saved.chats.length, savedAt: saved.savedAt });
    } catch (error) {
      res.status(500).json({ error: "Failed to save chats", detail: error.message });
    }
    return true;
  }

  if (req.path === "/api/health" && req.method === "GET") {
    res.json({
      ok: true,
      chatsApi: true,
      storage: CHATS_FILE,
      main: false,
      supervisor: true,
    });
    return true;
  }

  return false;
}

app.use((req, res, next) => {
  if (mainIsRunning()) {
    proxyToMain(req, res);
    return;
  }

  if (
    req.path === "/api/chats" &&
    (req.method === "PUT" || req.method === "POST")
  ) {
    jsonParser(req, res, (error) => {
      if (error) {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }
      if (handleOfflineChatPersistence(req, res)) {
        return;
      }
      next();
    });
    return;
  }

  if (handleOfflineChatPersistence(req, res)) {
    return;
  }

  if (req.path.startsWith("/api/")) {
    res.status(503).json({
      ok: false,
      error: "Chat server offline — click start in the sidebar",
      main: { running: false },
      control: { running: true },
    });
    return;
  }

  next();
});

app.use(express.static(PUBLIC_DIR, {
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
).listen(USER_PORT, async () => {
  console.log(`Ollama Chat supervisor at https://localhost:${USER_PORT}`);
  console.log(`Chat server internal port: ${MAIN_PORT}`);
  const result = await startMainServer();
  if (result.started) {
    const ready = await waitForMainServer();
    console.log(ready ? "Chat server started" : "Chat server start pending — check server.log");
  } else if (result.alreadyRunning) {
    console.log("Chat server already running");
  }
  console.log("Your browser will warn about the self-signed certificate — that is expected.");
});