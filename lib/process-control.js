import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.join(__dirname, "..");

export const USER_PORT = Number(process.env.USER_PORT || 3443);
export const MAIN_PORT = Number(process.env.MAIN_PORT || 3445);

const healthAgent = new https.Agent({ rejectUnauthorized: false });

export function isPortInUse(port) {
  try {
    const output = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    return Boolean(output);
  } catch {
    return false;
  }
}

export function killPort(port) {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { shell: true });
    return true;
  } catch {
    return false;
  }
}

async function isMainServerHealthy() {
  try {
    const response = await fetch(`https://127.0.0.1:${MAIN_PORT}/api/health`, {
      agent: healthAgent,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function startMainServer() {
  if (isPortInUse(MAIN_PORT)) {
    if (await isMainServerHealthy()) {
      return { ok: true, alreadyRunning: true };
    }
    killPort(MAIN_PORT);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  const logPath = path.join(PROJECT_DIR, "server.log");
  const logFd = fs.openSync(logPath, "a");

  const child = spawn(process.execPath, ["server.js"], {
    cwd: PROJECT_DIR,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, MAIN_PORT: String(MAIN_PORT), PORT: String(MAIN_PORT) },
  });
  child.unref();
  fs.closeSync(logFd);
  return { ok: true, started: true, pid: child.pid };
}

export function stopMainServer() {
  const wasRunning = isPortInUse(MAIN_PORT);
  killPort(MAIN_PORT);
  return { ok: true, stopped: wasRunning };
}

export async function restartMainServer() {
  killPort(MAIN_PORT);
  await new Promise((resolve) => setTimeout(resolve, 600));
  const result = await startMainServer();
  return { ...result, restarted: true };
}

export function getControlStatus() {
  return {
    ok: true,
    control: {
      running: true,
      port: USER_PORT,
      url: `https://localhost:${USER_PORT}`,
    },
    main: {
      running: isPortInUse(MAIN_PORT),
      port: MAIN_PORT,
      url: `https://localhost:${USER_PORT}`,
    },
  };
}

export async function waitForMainServer(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isMainServerHealthy()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}