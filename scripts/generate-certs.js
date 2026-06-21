import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.join(__dirname, "..", "certs");

fs.mkdirSync(certsDir, { recursive: true });

const keyPath = path.join(certsDir, "key.pem");
const certPath = path.join(certsDir, "cert.pem");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log("SSL certificates already exist.");
  process.exit(0);
}

execSync(
  `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`,
  { stdio: "inherit" }
);

console.log("Generated self-signed SSL certificates in certs/");