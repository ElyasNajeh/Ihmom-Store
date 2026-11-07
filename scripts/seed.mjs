#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "Ihmom-StoreAPI");
const forceLocal = process.argv.includes("--local");

function run(command, commandArgs, options) {
  const child = spawn(command, commandArgs, options);

  child.on("error", (error) => {
    console.error(`[seed] Failed to start ${command}: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function runLocal() {
  const candidates = [
    path.join(apiDir, ".venv", "Scripts", "python.exe"),
    path.join(apiDir, ".venv", "bin", "python"),
    path.join(root, ".venv", "Scripts", "python.exe"),
    path.join(root, ".venv", "bin", "python"),
  ];
  const python =
    candidates.find((candidate) => existsSync(candidate)) ??
    (process.platform === "win32" ? "python" : "python3");

  run(python, ["-m", "app.db.seed"], {
    cwd: apiDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
  });
}

if (forceLocal) {
  runLocal();
} else {
  const composeCheck = spawnSync("docker", ["compose", "ps", "-q", "api"], {
    cwd: root,
    encoding: "utf8",
  });
  const containerId = (composeCheck.stdout ?? "").trim();

  if (composeCheck.status === 0 && containerId) {
    run("docker", ["compose", "exec", "-T", "api", "python", "-m", "app.db.seed"], {
      cwd: root,
      stdio: "inherit",
    });
  } else {
    console.warn(
      "[seed] The API container is not running; falling back to host Python.",
    );
    console.warn(
      "[seed] Start the stack with `docker compose up -d` for the container environment.",
    );
    runLocal();
  }
}
