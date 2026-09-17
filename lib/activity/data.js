import "server-only";
import { getDatabase } from "@/lib/db/mongodb";

export async function findFavorites(userId) {
  const database = await getDatabase();
  return database.collection("favorites").find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function findFavoritesByUserInRange(userId, start, end) {
  const database = await getDatabase();
  return database.collection("favorites")
    .find({ userId, createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function findScrapHistoryByUserInRange(userId, start, end) {
  const database = await getDatabase();
  return database.collection("scrapHistory")
    .find({ userId, createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function saveFavorite(userId, wordId, selected) {
  const database = await getDatabase();
  const collection = database.collection("favorites");
  if (!selected) {
    await collection.deleteOne({ userId, wordId });
    return;
  }
  const createdAt = new Date();
  const result = await collection.updateOne(
    { userId, wordId },
    { $setOnInsert: { userId, wordId, createdAt } },
    { upsert: true }
  );
  if (result.upsertedCount === 1) {
    await database.collection("scrapHistory").insertOne({ userId, wordId, createdAt });
  }
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
