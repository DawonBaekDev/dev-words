"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateQuiz, submitQuiz } from "./actions";
import QuizQuestions from "./quiz-questions";
import QuizText from "@/components/quiz-text";
import { QUIZ_DIFFICULTIES, QUIZ_QUESTION_COUNT } from "@/lib/ai/validation";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

function ActionMessage({ state }) {
  if (!state.message) {
    return null;
  }

  return (
    <p className={`status-message ${state.type}`} role={state.type === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  );
}

export default function QuizClient({ category }) {
  const [quizState, quizFormAction, isQuizPending] = useActionState(
    generateQuiz,
    initialActionState
  );
  const [resultState, resultFormAction, isSubmitPending] = useActionState(
    submitQuiz,
    initialActionState
  );

  if (resultState.results) {
    return (
      <section aria-labelledby="quiz-result-heading">
        <h2 id="quiz-result-heading">AI 퀴즈 결과</h2>
        <p>카테고리: <strong>{category}</strong></p>
        <p><strong>{resultState.score}점 / {QUIZ_QUESTION_COUNT}점</strong></p>
        <ol className="quiz-question-list">
          {resultState.results.map((result, index) => (
            <li key={result.question}>
              <h3>{index + 1}번 문제</h3>
              <QuizText text={result.question} />
              <p className={result.isCorrect ? "status-message success" : "status-message error"}>
                {result.isCorrect ? "정답입니다." : "오답입니다."}
              </p>
              <p>선택한 답: <QuizText text={result.choices[result.selectedChoiceIndex]} inline /></p>
              <p>정답: <QuizText text={result.choices[result.correctChoiceIndex]} inline /></p>
              <p>해설</p>
              <QuizText text={result.explanation} />
            </li>
          ))}
        </ol>
        <p><Link href="/mypage#quiz-notes">퀴즈 노트에서 결과와 메모 보기</Link></p>
        <button type="button" onClick={() => window.location.reload()}>재도전</button>
        <Link href="/mypage">퀴즈 종료</Link>
      </section>
    );
  }

  if (quizState.questions) {
    return (
      <QuizQuestions
        key={quizState.quizId}
        quiz={quizState}
        formAction={resultFormAction}
        isPending={isSubmitPending}
      >
        <ActionMessage state={resultState} />
      </QuizQuestions>
    );
  }

  return (
    <section aria-labelledby="quiz-start-heading">
      <h2 id="quiz-start-heading">AI 퀴즈</h2>
      <p>선택한 카테고리: <strong>{category}</strong> · <Link href="/quiz">카테고리 변경</Link></p>
      <p>난이도를 선택하면 현재 등록된 {category === "전체" ? "전체 단어" : `${category} 단어`}에서 {QUIZ_QUESTION_COUNT}문제를 만듭니다.</p>
      <form action={quizFormAction}>
        <input type="hidden" name="category" value={category} />
        <fieldset>
          <legend>난이도</legend>
          {QUIZ_DIFFICULTIES.map((difficulty) => (
            <label key={difficulty} className="quiz-choice">
              <input type="radio" name="difficulty" value={difficulty} required />
              {difficulty}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={isQuizPending}>
          {isQuizPending ? "AI가 퀴즈를 만들고 있습니다." : "AI 퀴즈 시작"}
        </button>
        {isQuizPending ? (
          <p role="status" aria-live="polite">
            퀴즈를 준비하고 있어요. 잠시만 기다려 주세요.
            <br />
            문제를 만드는 데 시간이 조금 걸릴 수 있습니다.
          </p>
        ) : (
          <ActionMessage state={quizState} />
        )}
      </form>
    </section>
  );
}
