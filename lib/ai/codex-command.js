import { win32 } from "node:path";

export function buildWindowsCodexCandidates(whereOutput, nodeExecutablePath) {
  if (typeof whereOutput !== "string" || typeof nodeExecutablePath !== "string") {
    return [];
  }

  const discoveredPaths = [
    ...new Set(
      whereOutput
        .split(/\r?\n/)
        .map((path) => path.trim())
        .filter(Boolean)
    ),
  ];
  const candidates = [];

  for (const discoveredPath of discoveredPaths) {
    const extension = win32.extname(discoveredPath).toLowerCase();

    if (extension === ".exe") {
      candidates.push({
        command: discoveredPath,
        argumentsPrefix: [],
        requiredPath: discoveredPath,
      });
      continue;
    }

    if (extension === ".cmd" || extension === ".bat") {
      const codexScriptPath = win32.join(
        win32.dirname(discoveredPath),
        "node_modules",
        "@openai",
        "codex",
        "bin",
        "codex.js"
      );

      candidates.push({
        command: nodeExecutablePath,
        argumentsPrefix: [codexScriptPath],
        requiredPath: codexScriptPath,
      });
    }
  }

  return candidates;
}
