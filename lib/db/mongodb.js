import "server-only";
import { MongoClient } from "mongodb";

const globalForMongo = globalThis;

function createMongoClientPromise() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI 환경 변수가 필요합니다.");
  }

  const client = new MongoClient(mongoUri);

  return client.connect();
}

async function getMongoClient() {
  if (!globalForMongo.devWordsMongoClientPromise) {
    globalForMongo.devWordsMongoClientPromise = createMongoClientPromise();
  }

  try {
    return await globalForMongo.devWordsMongoClientPromise;
  } catch (error) {
    globalForMongo.devWordsMongoClientPromise = undefined;
    throw error;
  }
}

export async function getDatabase() {
  const client = await getMongoClient();
  const databaseName = process.env.MONGODB_DB_NAME || "dev-words";

  return client.db(databaseName);
}
