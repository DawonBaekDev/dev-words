import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

export async function findUserEmailsByIds(userIds) {
  const ids = [...new Set(userIds.filter((id) => typeof id === "string" && id))];
  if (ids.length === 0) return new Map();

  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const database = await getDatabase();
  const users = await database.collection("user")
    .find(
      { $or: [{ _id: { $in: objectIds } }, { _id: { $in: ids } }, { id: { $in: ids } }] },
      { projection: { email: 1, id: 1 } }
    )
    .toArray();

  const emailsById = new Map();
  for (const user of users) {
    emailsById.set(user._id.toString(), user.email);
    if (user.id) emailsById.set(user.id, user.email);
  }
  return emailsById;
}
