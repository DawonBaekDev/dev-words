import "server-only";
import { getDatabase } from "@/lib/db/mongodb";

export async function findMemoByUserAndWord(userId, wordId) {
  const database = await getDatabase();
  return database.collection("memos").findOne({ userId, wordId, deletedAt: { $exists: false } });
}

export async function savePersonalMemo({ userId, wordId, content }) {
  const database = await getDatabase();
  const collection = database.collection("memos");
  const existing = await collection.findOne({ userId, wordId });
  const now = new Date();
  const created = !existing || Boolean(existing.deletedAt);
  if (existing && !existing.deletedAt && existing.content === content) return { created: false };

  // 현재 메모와 이력을 한 문서에서 함께 변경해 삭제 후에도 기록을 보존합니다.
  const history = existing?.history ?? (existing ? [{
    type: "created", content: existing.content, createdAt: existing.createdAt,
  }, ...(existing.updatedAt > existing.createdAt ? [{
    type: "updated", content: existing.content, createdAt: existing.updatedAt,
  }] : [])] : []);
  history.push({ type: created ? "created" : "updated", content, createdAt: now });
  await collection.updateOne(
    { userId, wordId },
    {
      $set: { content, updatedAt: now, createdAt: created ? now : existing.createdAt },
      $push: { history: { $each: existing?.history ? history.slice(-1) : history } },
      $unset: { deletedAt: "" },
    },
    { upsert: true }
  );
  return { created };
}

export async function deletePersonalMemo({ userId, wordId }) {
  const database = await getDatabase();
  const collection = database.collection("memos");
  const existing = await collection.findOne({ userId, wordId, deletedAt: { $exists: false } });
  if (!existing) return;
  const now = new Date();
  const history = existing.history ?? [{ type: "created", content: existing.content, createdAt: existing.createdAt },
    ...(existing.updatedAt > existing.createdAt ? [{ type: "updated", content: existing.content, createdAt: existing.updatedAt }] : [])];
  history.push({ type: "deleted", content: existing.content, createdAt: now });
  await collection.updateOne({ _id: existing._id, userId }, {
    $set: { deletedAt: now, updatedAt: now },
    $push: { history: { $each: existing.history ? history.slice(-1) : history } },
  });
}
