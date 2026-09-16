import "server-only";
import { getDatabase } from "@/lib/db/mongodb";

export async function findMemoByUserAndWord(userId, wordId) {
  const database = await getDatabase();

  return database.collection("memos").findOne({ userId, wordId });
}

export async function savePersonalMemo({ userId, wordId, content }) {
  const database = await getDatabase();
  const memoCollection = database.collection("memos");
  const existingMemo = await memoCollection.findOne({ userId, wordId });

  if (existingMemo) {
    if (existingMemo.content !== content) {
      await memoCollection.updateOne(
        { _id: existingMemo._id, userId, wordId },
        {
          $set: {
            content,
            updatedAt: new Date(),
          },
        }
      );
    }

    return { created: false };
  }

  const now = new Date();

  try {
    await memoCollection.insertOne({
      userId,
      wordId,
      content,
      createdAt: now,
      updatedAt: now,
    });

    return { created: true };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    await memoCollection.updateOne(
      { userId, wordId },
      {
        $set: {
          content,
          updatedAt: new Date(),
        },
      }
    );

    return { created: false };
  }
}
