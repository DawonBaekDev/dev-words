import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

export async function createWordRequest({
  userId,
  requestedWord,
  normalizedWord,
}) {
  const database = await getDatabase();
  const requestCollection = database.collection("wordRequests");
  const existingRequest = await requestCollection.findOne({
    userId,
    normalizedWord,
    status: "pending",
  });

  if (existingRequest) {
    return { created: false, reason: "duplicate" };
  }

  const now = new Date();

  try {
    const result = await requestCollection.insertOne({
      userId,
      requestedWord,
      normalizedWord,
      status: "pending",
      draft: null,
      message: "자동생성 실패. 관리자 확인요망",
      createdAt: now,
      updatedAt: now,
    });

    return { created: true, requestId: result.insertedId.toString() };
  } catch (error) {
    if (error?.code === 11000) {
      return { created: false, reason: "duplicate" };
    }

    throw error;
  }
}

export async function findWordRequestsByUser(userId) {
  const database = await getDatabase();

  return database
    .collection("wordRequests")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updatePendingWordRequest({
  requestId,
  userId,
  requestedWord,
  normalizedWord,
}) {
  if (!ObjectId.isValid(requestId)) {
    return { updated: false, reason: "unavailable" };
  }

  const database = await getDatabase();
  const requestCollection = database.collection("wordRequests");
  const requestFilter = {
    _id: new ObjectId(requestId),
    userId,
    status: "pending",
  };
  const existingRequest = await requestCollection.findOne(requestFilter);

  if (!existingRequest) {
    return { updated: false, reason: "unavailable" };
  }

  if (
    existingRequest.requestedWord === requestedWord &&
    existingRequest.normalizedWord === normalizedWord
  ) {
    return { updated: false, reason: "unchanged" };
  }

  try {
    const updateResult = await requestCollection.updateOne(requestFilter, {
      $set: {
        requestedWord,
        normalizedWord,
        draft: null,
        message: "자동생성 실패. 관리자 확인요망",
        updatedAt: new Date(),
      },
    });

    if (updateResult.matchedCount === 0) {
      return { updated: false, reason: "unavailable" };
    }

    return { updated: true };
  } catch (error) {
    if (error?.code === 11000) {
      return { updated: false, reason: "duplicate" };
    }

    throw error;
  }
}

export async function completeWordRequestGroup({ normalizedWord, wordId }) {
  const database = await getDatabase();
  const result = await database.collection("wordRequests").updateMany(
    {
      normalizedWord,
      status: "pending",
    },
    {
      $set: {
        status: "completed",
        wordId,
        updatedAt: new Date(),
      },
      $unset: {
        rejectionReason: "",
      },
    }
  );

  return result.modifiedCount;
}

export async function rejectWordRequestGroup({ normalizedWord, reason }) {
  const database = await getDatabase();
  const result = await database.collection("wordRequests").updateMany(
    {
      normalizedWord,
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      },
      $unset: {
        wordId: "",
      },
    }
  );

  return result.modifiedCount;
}

export async function saveRequestDraft(requestId, normalizedWord, draft, message) {
  const database = await getDatabase();
  await database.collection("wordRequests").updateOne(
    { _id: new ObjectId(requestId), normalizedWord, status: "pending" },
    { $set: { draft, message, updatedAt: new Date() } }
  );
}

export async function findRequestGroups() {
  const database = await getDatabase();
  return database.collection("wordRequests").aggregate([
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: { normalizedWord: "$normalizedWord", status: "$status" },
      normalizedWord: { $first: "$normalizedWord" },
      status: { $first: "$status" },
      requestedWord: { $first: "$requestedWord" },
      requestCount: { $sum: 1 },
      firstRequestedAt: { $min: "$createdAt" },
      lastRequestedAt: { $max: "$createdAt" },
      requests: { $push: "$$ROOT" },
    } },
    { $sort: { lastRequestedAt: -1 } },
  ]).toArray();
}

export async function findPendingRequestGroup(normalizedWord) {
  const database = await getDatabase();
  return database.collection("wordRequests").findOne({ normalizedWord, status: "pending" });
}
