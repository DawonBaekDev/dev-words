import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db/mongodb";
import { findWords, findRandomWords } from "@/lib/words/data";
import { generateAiQuiz } from "./quiz";
import { QUIZ_QUESTION_COUNT } from "./validation";

const BANK_TARGET = 36;

function wordVersion(word) {
  return createHash("sha256").update(JSON.stringify([
    word.name, word.meaning, word.description, word.category,
    word.tags, word.codeExample, word.codeLanguage, word.updatedAt,
  ])).digest("hex");
}

function questionId(difficulty, question) {
  return createHash("sha256").update(JSON.stringify([
    difficulty, question.wordId, question.question.trim().replace(/\s+/g, " "),
  ])).digest("hex");
}

export async function findBankQuestions(category, difficulty) {
  const database = await getDatabase();
  const words = await findWords({ query: "", category: category === "전체" ? "" : category });
  const versions = new Map(words.map((word) => [word._id.toString(), wordVersion(word)]));
  const questions = await database.collection("quizQuestions").find({
    difficulty,
    ...(category === "전체" ? {} : { category }),
  }).toArray();
  // 현재 단어와 내용이 일치하는 문제만 사용합니다. 삭제된 단어도 여기서 제외됩니다.
  return questions.filter((question) => versions.get(question.wordId) === question.wordVersion);
}

export async function findRecentQuestionIds(userId) {
  const database = await getDatabase();
  const sessions = await database.collection("quizSessions").find({ userId })
    .sort({ createdAt: -1 }).limit(10).project({ questionIds: 1 }).toArray();
  return new Set(sessions.flatMap((session) => session.questionIds ?? []));
}

export function selectBankQuestions(questions, recentIds) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  const selected = [];
  const wordIds = new Set();
  for (const question of shuffled) {
    if (recentIds.has(question._id) || wordIds.has(question.wordId)) continue;
    selected.push(question);
    wordIds.add(question.wordId);
    if (selected.length === QUIZ_QUESTION_COUNT) break;
  }
  return selected;
}

export async function saveBankQuestions(quiz, words) {
  const database = await getDatabase();
  const wordsById = new Map(words.map((word) => [word._id.toString(), word]));
  for (const question of quiz.questions) {
    const word = wordsById.get(question.wordId);
    await database.collection("quizQuestions").updateOne(
      { _id: questionId(quiz.difficulty, question) },
      { $set: { ...question, difficulty: quiz.difficulty, category: word.category,
        wordVersion: wordVersion(word), createdAt: new Date() } },
      { upsert: true }
    );
  }
}

export async function generateBankQuestions(category, difficulty) {
  const words = await findRandomWords(QUIZ_QUESTION_COUNT, category);
  if (words.length !== QUIZ_QUESTION_COUNT) throw new Error("QUIZ_WORDS_INSUFFICIENT");
  const quiz = await generateAiQuiz({ difficulty, words });
  await saveBankQuestions(quiz, words);
}

export async function prepareBankQuiz({ userId, category, difficulty }) {
  const recentIds = await findRecentQuestionIds(userId);
  let questions = await findBankQuestions(category, difficulty);
  let selected = selectBankQuestions(questions, recentIds);
  if (selected.length < QUIZ_QUESTION_COUNT) {
    try {
      await generateBankQuestions(category, difficulty);
    } catch (error) {
      // 새 문제 생성이 실패해도 유효한 기존 문제가 있으면 복습할 수 있습니다.
      if (selectBankQuestions(questions, new Set()).length < QUIZ_QUESTION_COUNT) throw error;
      console.error("새 퀴즈 생성 실패, 기존 문제로 출제:", error);
    }
    questions = await findBankQuestions(category, difficulty);
    selected = selectBankQuestions(questions, recentIds);
  }
  // AI가 기존 문제를 다시 생성했거나 단어 수가 적으면 최근 문제도 복습용으로 허용합니다.
  if (selected.length < QUIZ_QUESTION_COUNT) selected = selectBankQuestions(questions, new Set());
  if (selected.length !== QUIZ_QUESTION_COUNT) throw new Error("QUIZ_WORDS_CHANGED");
  return {
    difficulty,
    questionIds: selected.map((question) => question._id),
    questions: selected.map(({ wordId, question, choices, correctChoiceIndex, explanation }) => (
      { wordId, question, choices, correctChoiceIndex, explanation }
    )),
  };
}

export async function replenishQuizBank(category, difficulty) {
  const database = await getDatabase();
  const collection = database.collection("quizBankRuns");
  const id = `${category}:${difficulty}`;
  const token = randomUUID();
  const now = new Date();
  try {
    // _id의 고유 인덱스로 같은 분야의 동시 보충을 막고, 중단된 작업은 2분 후 재시도합니다.
    await collection.updateOne({ _id: id, expiresAt: { $lte: now } }, {
      $set: { token, expiresAt: new Date(now.getTime() + 120_000) },
    }, { upsert: true });
  } catch (error) {
    if (error.code === 11000) return;
    throw error;
  }
  try {
    const questions = await findBankQuestions(category, difficulty);
    if (questions.length < BANK_TARGET) await generateBankQuestions(category, difficulty);
  } finally {
    await collection.deleteOne({ _id: id, token });
  }
}
