import assert from "node:assert/strict";
import test from "node:test";
import { buildWindowsCodexCandidates } from "../lib/ai/codex-command.js";

test("Windows npm 전역 설치의 codex.cmd를 Node 진입점으로 변환한다", () => {
  const candidates = buildWindowsCodexCandidates(
    [
      "C:\\Users\\learner\\AppData\\Roaming\\npm\\codex",
      "C:\\Users\\learner\\AppData\\Roaming\\npm\\codex.cmd",
    ].join("\r\n"),
    "C:\\Program Files\\nodejs\\node.exe"
  );

  assert.deepEqual(candidates, [
    {
      command: "C:\\Program Files\\nodejs\\node.exe",
      argumentsPrefix: [
        "C:\\Users\\learner\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js",
      ],
      requiredPath:
        "C:\\Users\\learner\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js",
    },
  ]);
});

test("Windows 네이티브 codex.exe도 직접 실행 후보로 유지한다", () => {
  const candidates = buildWindowsCodexCandidates(
    "C:\\Tools\\Codex\\codex.exe",
    "C:\\Program Files\\nodejs\\node.exe"
  );

  assert.deepEqual(candidates, [
    {
      command: "C:\\Tools\\Codex\\codex.exe",
      argumentsPrefix: [],
      requiredPath: "C:\\Tools\\Codex\\codex.exe",
    },
  ]);
});
