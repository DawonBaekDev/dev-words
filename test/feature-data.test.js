import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// 명시적으로 지정한 별도 검증 DB에서만 실행합니다.
const testDatabase = process.env.MONGODB_TEST_DB;

test("DB 통합: 메모 이력, 즐겨찾기, 최근 열람, AI 제한과 요청 상태", {
  skip: !testDatabase,
}, async () => {
  assert.match(testDatabase, /^dev-words-test-/);
  process.loadEnvFile(".env.local");
  process.env.MONGODB_DB_NAME = testDatabase;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
      if (specifier.startsWith("@/")) {
        return nextResolve(pathToFileURL(resolve(`${specifier.slice(2)}.js`)).href, context);
      }
      if (context.parentURL?.startsWith(pathToFileURL(resolve("lib")).href) && specifier.startsWith(".") && !specifier.endsWith(".js")) return nextResolve(`${specifier}.js`, context);
      return nextResolve(specifier, context);
    },
  });

  const { getDatabase } = await import("../lib/db/mongodb.js");
  const memos = await import("../lib/memos/data.js");
  const activity = await import("../lib/activity/data.js");
  const requests = await import("../lib/word-requests/data.js");
  const ai = await import("../lib/ai/data.js");
  const { prepareRequestDraft } = await import("../lib/word-requests/draft.js");
  const words = await import("../lib/words/data.js");
  const database = await getDatabase();
  const userId = `test-${Date.now()}`;
  const otherUserId = `${userId}-other`;
  const wordId = "111111111111111111111111";

  try {
    await memos.savePersonalMemo({ userId, wordId, content: "등록 내용" });
    await memos.savePersonalMemo({ userId, wordId, content: "수정 내용" });
    await memos.deletePersonalMemo({ userId, wordId });
    assert.equal(await memos.findMemoByUserAndWord(userId, wordId), null);
    assert.equal(await memos.findMemoByUserAndWord(otherUserId, wordId), null);
    await memos.savePersonalMemo({ userId, wordId, content: "재등록 내용" });
    const memo = await memos.findMemoByUserAndWord(userId, wordId);
    assert.deepEqual(memo.history.map((entry) => entry.type), ["created", "updated", "deleted", "created"]);
    assert.deepEqual(memo.history.map((entry) => entry.content), ["등록 내용", "수정 내용", "수정 내용", "재등록 내용"]);
    assert.ok(memo.history.every((entry) => entry.createdAt instanceof Date));

    await activity.saveFavorite(userId, wordId, true);
    await activity.saveFavorite(userId, wordId, true);
    assert.equal((await activity.findFavorites(userId)).length, 1);
    assert.equal((await activity.findFavorites(otherUserId)).length, 0);
    await activity.saveFavorite(userId, wordId, false);
    assert.equal((await activity.findFavorites(userId)).length, 0);

    for (let index = 0; index < 12; index++) await activity.recordRecentWord(userId, String(index));
    assert.deepEqual((await activity.findRecentWords(userId)).map((word) => word.wordId), ["11", "10", "9", "8", "7", "6", "5", "4", "3", "2"]);
    await activity.recordRecentWord(userId, "5");
    assert.equal((await activity.findRecentWords(userId))[0].wordId, "5");
    assert.equal((await activity.findRecentWords(userId)).length, 10);
    await activity.removeRecentWord(otherUserId, "5");
    assert.equal((await activity.findRecentWords(userId)).length, 10);
    await activity.removeRecentWord(userId, "5");
    assert.equal((await activity.findRecentWords(userId)).length, 9);
    await activity.removeRecentWord(userId, null);
    assert.deepEqual(await activity.findRecentWords(userId), []);

    const normalizedWord = `${userId}-word`;
    const requested = await requests.createWordRequest({ userId, requestedWord: normalizedWord, normalizedWord });
    const previousCliPath = process.env.CODEX_CLI_PATH;
    process.env.CODEX_CLI_PATH = "/nonexistent/dev-words-test-codex";
    try {
      await prepareRequestDraft({ requestId: requested.requestId, userId, requestedWord: normalizedWord, normalizedWord });
    } finally {
      if (previousCliPath === undefined) delete process.env.CODEX_CLI_PATH;
      else process.env.CODEX_CLI_PATH = previousCliPath;
    }
    const pending = await requests.findPendingRequestGroup(normalizedWord);
    assert.equal(pending.message, "자동생성 실패. 관리자 확인요망");
    assert.equal(pending.draft, null);
    assert.equal((await requests.createWordRequest({ userId, requestedWord: normalizedWord, normalizedWord })).reason, "duplicate");
    await requests.createWordRequest({ userId: otherUserId, requestedWord: normalizedWord, normalizedWord });
    assert.equal(await requests.completeWordRequestGroup({ normalizedWord, wordId }), 2);
    assert.equal((await requests.findWordRequestsByUser(userId))[0].status, "completed");
    const rejectedWord = `${normalizedWord}-rejected`;
    await requests.createWordRequest({ userId, requestedWord: rejectedWord, normalizedWord: rejectedWord });
    await requests.rejectWordRequestGroup({ normalizedWord: rejectedWord, reason: "현재 등록 중인 단어입니다." });
    const rejected = (await requests.findWordRequestsByUser(userId)).find((request) => request.normalizedWord === rejectedWord);
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.rejectionReason, "현재 등록 중인 단어입니다.");

    for (let index = 0; index < 5; index++) {
      const run = await ai.beginAiRun({ userId, type: "quiz" });
      assert.equal(run.started, true);
      const concurrent = await ai.beginAiRun({ userId, type: "quiz" });
      assert.equal(concurrent.reason, "running");
      await ai.endAiRun(run.runId);
    }
    assert.equal((await ai.beginAiRun({ userId, type: "quiz" })).reason, "limit");
    assert.deepEqual(await ai.findQuizUsage(userId), { used: 5, remaining: 0 });
    assert.deepEqual(await ai.findQuizUsage(otherUserId), { used: 0, remaining: 5 });
    const quizId = await ai.createQuizSession({ userId, quiz: { difficulty: "하", questions: [] } });
    assert.equal(await ai.consumeQuizSession({ quizId, userId: otherUserId }), null);
    assert.ok(await ai.consumeQuizSession({ quizId, userId }));
    assert.equal(await ai.consumeQuizSession({ quizId, userId }), null);

    const slug = `${userId}-delete`;
    await words.createWord({ name: slug, slug, description: "삭제 검증" }, { id: userId, email: "admin@example.com" }, "AI요청");
    await words.updateWordBySlug(slug, { name: slug, slug, description: "수정 검증" }, { id: otherUserId, email: "editor@example.com" });
    const historyWord = (await words.findAdminWordHistory()).find((word) => word.slug === slug);
    assert.equal(historyWord.source, "AI요청");
    assert.equal(historyWord.history[1].before.description, "삭제 검증");
    assert.equal(historyWord.history[1].after.description, "수정 검증");
    assert.equal(historyWord.history[1].userId, otherUserId);
    assert.equal((await words.findWordBySlug(slug)).history, undefined);
    assert.equal(await words.deleteWordBySlug(slug), true);
    assert.equal(await words.findWordBySlug(slug), null);
    const archive = await database.collection("wordHistory").findOne({ slug });
    assert.equal(archive.history.length, 2);
    assert.equal(archive.source, "AI요청");
    assert.ok(archive.deletedAt instanceof Date);
  } finally {
    // 이 테스트 실행이 만든 문서만 정리합니다. 기존 데이터에는 접근하지 않습니다.
    for (const name of ["memos", "favorites", "recentWords", "wordRequests", "aiUsage", "aiRuns", "quizSessions"]) {
      await database.collection(name).deleteMany({ userId: { $in: [userId, otherUserId] } });
    }
    await database.collection("words").deleteMany({ slug: `${userId}-delete` });
    await database.collection("wordHistory").deleteMany({ slug: `${userId}-delete` });
    await (await globalThis.devWordsMongoClientPromise).close();
    globalThis.devWordsMongoClientPromise = undefined;
    hooks.deregister();
  }
});
