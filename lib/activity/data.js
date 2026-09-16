import "server-only";
import { getDatabase } from "@/lib/db/mongodb";

export async function findFavorites(userId) {
  const database = await getDatabase();
  return database.collection("favorites").find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function saveFavorite(userId, wordId, selected) {
  const database = await getDatabase();
  const collection = database.collection("favorites");
  if (!selected) {
    await collection.deleteOne({ userId, wordId });
    return;
  }
  await collection.updateOne({ userId, wordId }, { $setOnInsert: { userId, wordId, createdAt: new Date() } }, { upsert: true });
}

export async function recordRecentWord(userId, wordId) {
  const database = await getDatabase();
  // 사용자별 한 문서 안에서 순서를 갱신하고 최대 10개만 남깁니다.
  await database.collection("recentWords").updateOne({ userId }, [{
    $set: {
      userId: { $literal: userId },
      words: { $slice: [{ $concatArrays: [
        [{ wordId, viewedAt: new Date() }],
        { $filter: { input: { $ifNull: ["$words", []] }, as: "word", cond: { $ne: ["$$word.wordId", wordId] } } },
      ] }, 10] },
    },
  }], { upsert: true });
}

export async function findRecentWords(userId) {
  const database = await getDatabase();
  const recent = await database.collection("recentWords").findOne({ userId });
  return recent?.words ?? [];
}

export async function removeRecentWord(userId, wordId) {
  const database = await getDatabase();
  if (wordId === null) {
    await database.collection("recentWords").deleteOne({ userId });
  } else {
    await database.collection("recentWords").updateOne({ userId }, { $pull: { words: { wordId } } });
  }
}
