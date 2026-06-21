import { execSync, spawnSync } from "node:child_process";

const RECOMMENDED_MODELS = [
  {
    name: "qwen3.5:9b",
    label: "Qwen 3.5 9B",
    note: "Primary — vision, tools, thinking",
  },
  {
    name: "glm4:9b",
    label: "GLM-4 9B",
    note: "Alternate — strong bilingual reasoning",
  },
];

function commandExists(command) {
  const check = spawnSync(command, ["--version"], { stdio: "ignore", shell: true });
  return check.status === 0;
}

function pullModel(model) {
  console.log(`\nPulling ${model.label} (${model.name})...`);
  console.log(`  ${model.note}`);
  execSync(`ollama pull ${model.name}`, { stdio: "inherit", shell: true });
}

console.log("Ollama Chat — 9B model installer");
console.log("Target: best-in-class ~9B local intelligence\n");

if (!commandExists("ollama")) {
  console.error("Ollama is not installed or not on your PATH.");
  console.error("");
  console.error("Install Ollama first:");
  console.error("  macOS:   brew install ollama && brew services start ollama");
  console.error("  Windows: https://ollama.com/download");
  console.error("  Linux:   curl -fsSL https://ollama.com/install.sh | sh");
  process.exit(1);
}

try {
  execSync("ollama list", { stdio: "pipe", shell: true });
} catch {
  console.error("Ollama is installed but does not appear to be running.");
  console.error("Start it with: brew services start ollama  (macOS)");
  console.error("Or run: ollama serve");
  process.exit(1);
}

for (const model of RECOMMENDED_MODELS) {
  pullModel(model);
}

console.log("\nAll recommended 9B models are ready.");
console.log("Start the app: npm start");
console.log("Open: https://localhost:3443");