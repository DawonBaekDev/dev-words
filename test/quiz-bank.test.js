import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve, join } from "node:path";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(pathToFileURL(resolve(`${specifier.slice(2)}.js`)).href, context);
    if (context.parentURL?.startsWith(pathToFileURL(resolve("lib")).href) && specifier.startsWith(".") && !specifier.endsWith(".js")) return nextResolve(`${specifier}.js`, context);
    return nextResolve(specifier, context);
  },
});
const bank = await import("../lib/ai/quiz-bank.js");

test("문제은행은 최근 문제와 같은 회차의 중복 단어를 제외한다", () => {
  const questions = [
    { _id: "recent", wordId: "a" },
    { _id: "a1", wordId: "a" }, { _id: "a2", wordId: "a" },
    { _id: "b", wordId: "b" }, { _id: "c", wordId: "c" },
  ];
  const selected = bank.selectBankQuestions(questions, new Set(["recent"]));
  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map((question) => question.wordId)).size, 3);
  assert.ok(selected.every((question) => question._id !== "recent"));
  assert.equal(questions[0]._id, "recent");
  assert.equal(bank.selectBankQuestions(questions, new Set(questions.map((question) => question._id))).length, 0);
});

const testDatabase = process.env.MONGODB_TEST_DB;
test("DB 통합: 문제은행 재사용, 보충, 최근 회차 제외, 단어 변경·삭제 무효화", { skip: !testDatabase }, async () => {
  assert.match(testDatabase, /^dev-words-test-/);
  process.loadEnvFile(".env.local");
  process.env.MONGODB_DB_NAME = `${testDatabase}-bank`;
  const { getDatabase } = await import("../lib/db/mongodb.js");
  const { createQuizSession, completeQuizSession } = await import("../lib/ai/data.js");
  const database = await getDatabase();
  const { ObjectId } = await import("mongodb");
  const userId = `bank-test-${Date.now()}`;
  const now = new Date();
  const words = Array.from({ length: 3 }, (_, index) => ({
    _id: new ObjectId(), name: `${userId}-${index}`, slug: `${userId}-${index}`,
    category: "React", description: "테스트 단어", updatedAt: now,
  }));
  const ids = words.map((word) => word._id.toString());
  const directory = await mkdtemp(join(tmpdir(), "quiz-bank-test-"));
  const cliPath = join(directory, "codex.mjs");
  const previousCliPath = process.env.CODEX_CLI_PATH;
  try {
    await database.collection("words").insertMany(words);
    // 실제 AI를 호출하지 않고 같은 JSON 계약을 반환하는 CLI로 생성·저장 흐름을 검증합니다.
    await writeFile(cliPath, `#!/usr/bin/env node
let input = "";
for await (const chunk of process.stdin) input += chunk;
const words = JSON.parse(input.split("단어 데이터: ")[1]);
const difficulty = JSON.parse(input.split("난이도: ")[1].split("\\n")[0]);
console.log(JSON.stringify({ difficulty, questions: words.map((word) => ({
  wordId: word.id, question: word.name + " 문제 " + Date.now(),
  choices: ["가", "나", "다", "라"], correctChoiceIndex: 1, explanation: "설명"
})) }));
`);
    await chmod(cliPath, 0o700);
    process.env.CODEX_CLI_PATH = cliPath;
    const first = await bank.prepareBankQuiz({ userId, category: "React", difficulty: "하" });
    assert.equal(first.questions.length, 3);
    assert.equal((await bank.findBankQuestions("React", "하")).length, 3);
    assert.equal((await bank.findBankQuestions("데이터", "하")).length, 0);
    assert.equal((await bank.findBankQuestions("React", "상")).length, 0);
    assert.equal((await bank.findBankQuestions("전체", "하")).length, 3);
    const quizId = await createQuizSession({ userId, category: "React", quiz: first });
    await completeQuizSession({ userId, quizId, answers: [1, 1, 1] });
    assert.deepEqual(await bank.findRecentQuestionIds(userId), new Set(first.questionIds));
    assert.equal((await bank.findRecentQuestionIds(`${userId}-other`)).size, 0);

    // 동시 보충은 한 번만 실행됩니다.
    await Promise.all([bank.replenishQuizBank("React", "하"), bank.replenishQuizBank("React", "하")]);
    assert.equal((await bank.findBankQuestions("React", "하")).length, 6);
    process.env.CODEX_CLI_PATH = "/nonexistent/quiz-bank-test-cli";
    const start = performance.now();
    const second = await bank.prepareBankQuiz({ userId, category: "React", difficulty: "하" });
    console.log(`문제은행 출제(CLI 사용 불가 상태): ${Math.round(performance.now() - start)}ms`);
    assert.ok(second.questionIds.every((id) => !first.questionIds.includes(id)));
    assert.equal(second.questions.length, 3);
    assert.ok(second.questions.every((question) => question.correctChoiceIndex === 1));
    const savedCount = await database.collection("quizQuestions").countDocuments({ wordId: { $in: ids } });
    await assert.rejects(bank.replenishQuizBank("React", "하"), /AI_CLI_UNAVAILABLE/);
    assert.equal(await database.collection("quizBankRuns").countDocuments({ _id: "React:하" }), 0);
    assert.equal(await database.collection("quizQuestions").countDocuments({ wordId: { $in: ids } }), savedCount);

    await database.collection("words").updateOne({ _id: words[0]._id }, { $set: { description: "수정됨" } });
    assert.ok((await bank.findBankQuestions("React", "하")).every((question) => question.wordId !== ids[0]));
    await database.collection("words").deleteOne({ _id: words[1]._id });
    assert.ok((await bank.findBankQuestions("React", "하")).every((question) => question.wordId === ids[2]));
  } finally {
    if (previousCliPath === undefined) delete process.env.CODEX_CLI_PATH;
    else process.env.CODEX_CLI_PATH = previousCliPath;
    await database.collection("quizQuestions").deleteMany({ wordId: { $in: ids } });
    await database.collection("words").deleteMany({ _id: { $in: words.map((word) => word._id) } });
    await database.collection("quizSessions").deleteMany({ userId });
    await rm(directory, { recursive: true, force: true });
    await (await globalThis.devWordsMongoClientPromise).close();
    globalThis.devWordsMongoClientPromise = undefined;
  }
});
