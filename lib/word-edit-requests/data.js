import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

export async function findWordEditRequestsByUser(userId) {
  const database = await getDatabase();

  return database
    .collection("wordEditRequests")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function findPendingWordEditRequest({ userId, wordId }) {
  const database = await getDatabase();

  return database.collection("wordEditRequests").findOne({
    userId,
    wordId,
    status: "pending",
  });
}

export async function savePendingWordEditRequest({ userId, wordId, message }) {
  const database = await getDatabase();
  const requestCollection = database.collection("wordEditRequests");
  const existingRequest = await requestCollection.findOne({
    userId,
    wordId,
    status: "pending",
  });

  if (existingRequest) {
    if (existingRequest.message === message) {
      return { saved: false, reason: "unchanged" };
    }

    await requestCollection.updateOne(
      { _id: existingRequest._id },
      {
        $set: {
          message,
          updatedAt: new Date(),
        },
      }
    );

    return { saved: true, updated: true };
  }

  const now = new Date();

  try {
    await requestCollection.insertOne({
      userId,
      wordId,
      message,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { saved: true, updated: false };
  } catch (error) {
    if (error?.code === 11000) {
      return { saved: false, reason: "duplicate" };
    }

    throw error;
  }
}

export async function findPendingWordEditRequests() {
  const database = await getDatabase();

  return database
    .collection("wordEditRequests")
    .find({ status: "pending" })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function rejectWordEditRequest({ requestId, reason }) {
  if (!ObjectId.isValid(requestId)) {
    return false;
  }

  const database = await getDatabase();
  const result = await database.collection("wordEditRequests").updateOne(
    {
      _id: new ObjectId(requestId),
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

export async function completeWordEditRequest({ requestId, wordId }) {
  if (!ObjectId.isValid(requestId)) {
    return false;
  }

  const database = await getDatabase();
  const result = await database.collection("wordEditRequests").updateOne(
    {
      _id: new ObjectId(requestId),
      wordId,
      status: "pending",
    },
    {
      $set: {
        status: "completed",
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

export async function findPendingWordEditRequestById(requestId, wordId) {
  if (!ObjectId.isValid(requestId)) {
    return null;
  }

  const database = await getDatabase();

  return database.collection("wordEditRequests").findOne({
    _id: new ObjectId(requestId),
    wordId,
    status: "pending",
  });
}

export async function updatePendingWordEditRequest({ requestId, userId, message }) {
  if (!ObjectId.isValid(requestId)) {
    return { updated: false, reason: "unavailable" };
  }

  const database = await getDatabase();
  const requestCollection = database.collection("wordEditRequests");
  const existingRequest = await requestCollection.findOne({
    _id: new ObjectId(requestId),
    userId,
    status: "pending",
  });

  if (!existingRequest) {
    return { updated: false, reason: "unavailable" };
  }

  if (existingRequest.message === message) {
    return { updated: false, reason: "unchanged" };
  }

  await requestCollection.updateOne(
    { _id: existingRequest._id },
    {
      $set: {
        message,
        updatedAt: new Date(),
      },
    }
  );

  return { updated: true };
}
