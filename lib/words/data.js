import "server-only";
import { getDatabase } from "@/lib/db/mongodb";
import { buildWordMongoFilter } from "@/lib/words/search";

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
