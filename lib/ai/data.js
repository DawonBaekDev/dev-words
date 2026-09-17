import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { QUIZ_QUESTION_COUNT } from "./validation";

export const AI_DAILY_LIMIT = 5;

function getKoreaDateKey() {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateValues = Object.fromEntries(
    dateParts
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, part.value])
  );

  return `${dateValues.year}-${dateValues.month}-${dateValues.day}`;
}

export async function findQuizUsage(userId) {
  const database = await getDatabase();
  const usage = await database.collection("aiUsage").findOne({
    userId,
    type: "quiz",
    dateKey: getKoreaDateKey(),
  });
  const used = usage?.count ?? 0;
  return { used, remaining: Math.max(0, AI_DAILY_LIMIT - used) };
}

export async function beginAiRun({ userId, type }) {
  const database = await getDatabase();
  const runCollection = database.collection("aiRuns");
  const run = {
    userId,
    type,
    status: "running",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 2 * 60 * 1000),
  };

  try {
    const result = await runCollection.insertOne(run);
    const usageCollection = database.collection("aiUsage");
    const dateKey = getKoreaDateKey();
    const usage = await usageCollection.findOne({ userId, type, dateKey });

    if (usage?.count >= AI_DAILY_LIMIT) {
      await runCollection.deleteOne({ _id: result.insertedId });
      return { started: false, reason: "limit" };
    }

    await usageCollection.updateOne(
      { userId, type, dateKey },
      {
        $setOnInsert: { userId, type, dateKey, createdAt: new Date() },
        $inc: { count: 1 },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return { started: true, runId: result.insertedId.toString() };
  } catch (error) {
    if (error?.code === 11000) {
      return { started: false, reason: "running" };
    }

    throw error;
  }
}

export async function endAiRun(runId) {
  if (!ObjectId.isValid(runId)) {
    return;
  }

  const database = await getDatabase();
  await database.collection("aiRuns").deleteOne({ _id: new ObjectId(runId) });
}

export async function createQuizSession({ userId, quiz, category = "전체" }) {
  const database = await getDatabase();
  const now = new Date();
  const result = await database.collection("quizSessions").insertOne({
    userId,
    category,
    difficulty: quiz.difficulty,
    questions: quiz.questions,
    questionIds: quiz.questionIds ?? [],
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });

  return result.insertedId.toString();
}

export async function completeQuizSession({ quizId, userId, answers }) {
  if (!ObjectId.isValid(quizId)) {
    return null;
  }

  const database = await getDatabase();
  const collection = database.collection("quizSessions");
  const quiz = await collection.findOne({
    _id: new ObjectId(quizId),
    userId,
    expiresAt: { $gt: new Date() },
    completedAt: { $exists: false },
  });

  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length !== QUIZ_QUESTION_COUNT || answers.length !== QUIZ_QUESTION_COUNT) {
    return null;
  }

  const results = quiz.questions.map((question, index) => ({
    wordId: question.wordId,
    question: question.question,
    choices: question.choices,
    selectedChoiceIndex: answers[index],
    correctChoiceIndex: question.correctChoiceIndex,
    explanation: question.explanation,
    isCorrect: answers[index] === question.correctChoiceIndex,
  }));
  const score = results.filter((result) => result.isCorrect).length;

  // 제출한 세션에서 만료 시각을 제거하면 같은 문서가 퀴즈 노트로 계속 남습니다.
  return collection.findOneAndUpdate(
    {
      _id: quiz._id,
      userId,
      expiresAt: { $gt: new Date() },
      completedAt: { $exists: false },
    },
    {
      $set: { completedAt: new Date(), score, results, memo: "" },
      $unset: { questions: "", expiresAt: "" },
    },
    { returnDocument: "after", includeResultMetadata: false }
  );
}

export async function findCompletedQuizzesByUser(userId) {
  const database = await getDatabase();
  return database.collection("quizSessions")
    .find({ userId, completedAt: { $exists: true } })
    .sort({ completedAt: -1 })
    .toArray();
}

export async function saveQuizMemo({ quizId, userId, content }) {
  if (!ObjectId.isValid(quizId)) return false;
  const database = await getDatabase();
  const result = await database.collection("quizSessions").updateOne(
    { _id: new ObjectId(quizId), userId, completedAt: { $exists: true } },
    { $set: { memo: content, memoUpdatedAt: new Date() } }
  );
  return result.matchedCount === 1;
}
