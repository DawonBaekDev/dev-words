import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import QuizClient from "./quiz-client";
import { canUseAiQuiz } from "@/lib/ai/access";
import { QUIZ_CATEGORIES, QUIZ_QUESTION_COUNT } from "@/lib/ai/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { findQuizCategoryCounts } from "@/lib/words/data";

export const maxDuration = 180;

export const metadata = {
  title: "AI 퀴즈",
};

export default async function QuizPage({ searchParams }) {
  await connection();

  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/");
  }

  if (!canUseAiQuiz(session.user)) {
    redirect("/admin");
  }

  const requestedCategory = (await searchParams)?.category;
  const category = typeof requestedCategory === "string" && QUIZ_CATEGORIES.includes(requestedCategory)
    ? requestedCategory : null;
  const categoryCounts = category ? [] : await findQuizCategoryCounts();
  const countsByCategory = new Map(categoryCounts.map((item) => [item._id, item.count]));
  const totalWords = categoryCounts.reduce((total, item) => total + item.count, 0);

  return (
    <main className="quiz-page">
      <p className="quiz-back-link"><Link href="/mypage">← 마이페이지로</Link></p>
      {category ? (
        <QuizClient key={category} category={category} />
      ) : (
        <section className="quiz-shell quiz-category" aria-labelledby="quiz-category-heading">
          <h2 id="quiz-category-heading">AI 퀴즈 · 카테고리 선택</h2>
          <p className="quiz-intro">공부할 단어 분야를 고른 다음 난이도를 선택하세요. 현재 등록된 단어에서 출제합니다.</p>
          <form className="quiz-form" action="/quiz" method="get">
            <fieldset>
              <legend>카테고리</legend>
              <div className="quiz-option-grid quiz-category-options">
                {QUIZ_CATEGORIES.map((option) => {
                  const count = option === "전체" ? totalWords : countsByCategory.get(option) ?? 0;
                  return (
                    <label key={option} className="quiz-choice">
                      <input type="radio" name="category" value={option} required disabled={count < QUIZ_QUESTION_COUNT} />
                      {option} · {count}개
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="quiz-help">한 번에 {QUIZ_QUESTION_COUNT}문제를 만들기 때문에 단어가 {QUIZ_QUESTION_COUNT}개 미만인 카테고리는 선택할 수 없습니다.</p>
            <div className="quiz-primary-action"><button type="submit">난이도 선택</button></div>
          </form>
        </section>
      )}
    </main>
  );
}
