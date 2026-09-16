import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

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

export async function createQuizSession({ userId, quiz }) {
  const database = await getDatabase();
  const now = new Date();
  const result = await database.collection("quizSessions").insertOne({
    userId,
    difficulty: quiz.difficulty,
    questions: quiz.questions,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });

  return result.insertedId.toString();
}

export async function consumeQuizSession({ quizId, userId }) {
  if (!ObjectId.isValid(quizId)) {
    return null;
  }

  const database = await getDatabase();

  return database.collection("quizSessions").findOneAndDelete(
    {
      _id: new ObjectId(quizId),
      userId,
      expiresAt: { $gt: new Date() },
    },
    { includeResultMetadata: false }
  );
}
