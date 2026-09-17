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
    .find(buildWordMongoFilter(filters), { projection: { history: 0 } })
    .sort({ name: 1 })
    .toArray();
}

export async function findWordBySlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }

  const database = await getDatabase();

  return database.collection("words").findOne({ slug }, { projection: { history: 0 } });
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
    .find({ _id: { $in: objectIds } }, { projection: { history: 0 } })
    .toArray();
}

export async function findQuizCategoryCounts() {
  const database = await getDatabase();
  return database.collection("words").aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]).toArray();
}

export async function findRandomWords(count, category = "전체") {
  const database = await getDatabase();
  const stages = category === "전체" ? [] : [{ $match: { category } }];
  return database.collection("words").aggregate([
    ...stages,
    { $sample: { size: count } },
  ]).toArray();
}

export async function createWord(word, admin = null, source = "관리자 작성") {
  const database = await getDatabase();
  const now = new Date();

  const result = await database.collection("words").insertOne({
    ...word,
    source,
    history: [{ type: "created", userId: admin?.id ?? "", email: admin?.email ?? "", before: null, after: wordContent(word), createdAt: now }],
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function updateWordBySlug(slug, word, admin = null) {
  const database = await getDatabase();
  const existing = await database.collection("words").findOne({ slug });
  if (!existing) return false;
  const now = new Date();
  const result = await database.collection("words").updateOne(
    { _id: existing._id, updatedAt: existing.updatedAt },
    {
      $set: { ...word, updatedAt: now },
      $push: { history: {
        type: "updated", userId: admin?.id ?? "", email: admin?.email ?? "",
        before: wordContent(existing), after: wordContent(word), createdAt: now,
      } },
    }
  );
  if (!result.matchedCount) throw new Error("다른 관리자가 변경했습니다. 새로고침 후 다시 시도해 주세요.");
  return true;
}

export function wordContent(word) {
  const { name, meaning, slug, description, category, tags, codeExample, codeLanguage } = word;
  return { name, meaning, slug, description, category, tags, codeExample, codeLanguage };
}

export async function deleteWordBySlug(slug) {
  const database = await getDatabase();
  const word = await database.collection("words").findOne({ slug });
  if (!word) return false;
  // 삭제 전에 별도 컬렉션에 보관합니다. 보관 실패 시 원본을 삭제하지 않습니다.
  await database.collection("wordHistory").updateOne(
    { _id: word._id.toString() },
    { $set: { ...wordContent(word), wordId: word._id.toString(), source: word.source ?? "", history: word.history ?? [], createdAt: word.createdAt, updatedAt: word.updatedAt, deletedAt: new Date() } },
    { upsert: true }
  );
  const result = await database.collection("words").deleteOne({ _id: word._id, updatedAt: word.updatedAt });
  if (!result.deletedCount) throw new Error("다른 관리자가 변경했습니다. 새로고침 후 다시 시도해 주세요.");
  return true;
}

export async function findAdminWordHistory() {
  const database = await getDatabase();
  const [current, archived, requests] = await Promise.all([
    database.collection("words").find({}).sort({ updatedAt: -1 }).toArray(),
    database.collection("wordHistory").find({}).sort({ deletedAt: -1 }).toArray(),
    database.collection("wordRequests").find({ status: "completed" }).toArray(),
  ]);
  const currentIds = new Set(current.map((word) => word._id.toString()));
  const result = [...current, ...archived.filter((word) => !currentIds.has(word.wordId))];
  for (const word of result) {
    if (!word.source) {
      const linkedRequests = requests.filter((request) => request.wordId === word._id.toString());
      word.source = linkedRequests.some((request) => request.draft) ? "AI요청"
        : linkedRequests.length ? "관리자 작성" : "초기 데이터";
    } else if (word.source === "기존 등록 · 경로 미확인") {
      word.source = "초기 데이터";
    }
  }
  return result.sort((first, second) => second.createdAt - first.createdAt);
}
