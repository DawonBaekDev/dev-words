import "server-only";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const CODEX_TIMEOUT_MS = 60_000;
const execFileAsync = promisify(execFile);

async function getCodexCommand() {
  if (process.env.CODEX_CLI_PATH) {
    return process.env.CODEX_CLI_PATH;
  }

  if (process.platform !== "win32") {
    return "codex";
  }

  try {
    const { stdout } = await execFileAsync("where.exe", ["codex"], {
      windowsHide: true,
    });
    const executablePath = stdout
      .split(/\r?\n/)
      .map((path) => path.trim())
      .find((path) => path.toLowerCase().endsWith(".exe"));

    if (executablePath) {
      return executablePath;
    }
  } catch (error) {
    console.error("Codex 실행 파일 경로 확인 실패:", error);
  }

  throw new Error("AI_CLI_UNAVAILABLE");
}

function getCodexEnvironment() {
  const allowedKeys = [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "ComSpec",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "CODEX_HOME",
    "HOME",
  ];
  const environment = {};

  for (const key of allowedKeys) {
    if (process.env[key]) {
      environment[key] = process.env[key];
    }
  }

  return environment;
}

function runProcess(command, argumentsList, input, workingDirectory) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: workingDirectory,
      env: getCodexEnvironment(),
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, CODEX_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(new Error("AI_TIMEOUT"));
        return;
      }

      if (code !== 0) {
        console.error("Codex CLI 실행 실패:", stderr);
        reject(new Error("AI_CLI_FAILED"));
        return;
      }

      resolve(stdout);
    });

    child.stdin.end(input);
  });
}

export async function runCodexStructuredOutput({ prompt, schema }) {
  const workingDirectory = await mkdtemp(join(tmpdir(), "dev-words-ai-"));
  const schemaPath = join(workingDirectory, "output-schema.json");

  try {
    await writeFile(schemaPath, JSON.stringify(schema), "utf8");

    const output = await runProcess(
      await getCodexCommand(),
      [
        "exec",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--output-schema",
        schemaPath,
        "--color",
        "never",
        "-",
      ],
      prompt,
      workingDirectory
    );

    return output.trim();
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}
