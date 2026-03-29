import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = { ...process.env, SKIP_MONGO: process.env.SKIP_MONGO || "1" };

const server = spawn("npm", ["start"], {
  cwd: join(root, "server"),
  env,
  stdio: "inherit",
  shell: true,
});

const dashboard = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1"], {
  cwd: join(root, "dashboard"),
  stdio: "inherit",
  shell: true,
});

function shutdown() {
  server.kill("SIGINT");
  dashboard.kill("SIGINT");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("exit", (code) => {
  if (code && code !== 0) {
    console.error("Server exited with code", code);
  }
  dashboard.kill("SIGINT");
});

dashboard.on("exit", (code) => {
  if (code && code !== 0) {
    console.error("Dashboard exited with code", code);
  }
  server.kill("SIGINT");
});
