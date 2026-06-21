import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function run(command) {
  execSync(command, { cwd: root, stdio: "inherit", shell: true });
}

console.log("=== Ollama Chat — full setup ===\n");

console.log("Step 1/3: TLS certificates");
run("node scripts/generate-certs.js");

console.log("\nStep 2/3: Recommended 9B models (qwen3.5:9b + glm4:9b)");
run("node scripts/install-models.js");

console.log("\nStep 3/3: Ready");
console.log("Run: npm start");
console.log("Open: https://localhost:3443");