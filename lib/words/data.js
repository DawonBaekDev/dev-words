import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import {
  buildWordMongoFilter,
  escapeRegularExpression,
} from "@/lib/words/search";

export async function findWords(filters) {
  const database = await getDatabase();

  return database
    .collection("words")
    .find(buildWordMongoFilter(filters))
    .sort({ name: 1 })
    .toArray();
}

export async function findWordBySlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }

  const database = await getDatabase();

  return database.collection("words").findOne({ slug });
}

export async function findWordByExactName(name) {
  if (typeof name !== "string" || !name.trim()) {
    return null;
  }

  const database = await getDatabase();
  const exactNameExpression = new RegExp(
    `^${escapeRegularExpression(name.trim())}$`,
    "i"
  );

  return database.collection("words").findOne({ name: exactNameExpression });
}

export async function findWordsByIds(wordIds) {
  const objectIds = wordIds
    .filter((wordId) => ObjectId.isValid(wordId))
    .map((wordId) => new ObjectId(wordId));

  if (objectIds.length === 0) {
    return [];
  }

  const database = await getDatabase();

  return database
    .collection("words")
    .find({ _id: { $in: objectIds } })
    .toArray();
}

export async function findRandomWords(count) {
  const database = await getDatabase();

  return database.collection("words").aggregate([{ $sample: { size: count } }]).toArray();
}

export async function createWord(word) {
  const database = await getDatabase();
  const now = new Date();

  const result = await database.collection("words").insertOne({
    ...word,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function updateWordBySlug(slug, word) {
  const database = await getDatabase();

  const result = await database.collection("words").updateOne(
    { slug },
    {
      $set: {
        ...word,
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

export async function deleteWordBySlug(slug) {
  const database = await getDatabase();
  const result = await database.collection("words").deleteOne({ slug });

  return result.deletedCount > 0;
}
