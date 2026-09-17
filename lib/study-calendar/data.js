import "server-only";
import { getDatabase } from "@/lib/db/mongodb";

export async function findStudyNotesByMonth(userId, monthKey) {
  const database = await getDatabase();
  return database.collection("studyNotes")
    .find({ userId, dateKey: { $gte: `${monthKey}-01`, $lte: `${monthKey}-31` } })
    .sort({ dateKey: 1 })
    .toArray();
}

export async function saveStudyNote({ userId, dateKey, content }) {
  const database = await getDatabase();
  const now = new Date();
  await database.collection("studyNotes").updateOne(
    { _id: `${userId}:${dateKey}`, userId },
    {
      $set: { content, updatedAt: now },
      $setOnInsert: { userId, dateKey, createdAt: now },
    },
    { upsert: true }
  );
}

export async function deleteStudyNote({ userId, dateKey }) {
  const database = await getDatabase();
  await database.collection("studyNotes").deleteOne({ _id: `${userId}:${dateKey}`, userId });
}
