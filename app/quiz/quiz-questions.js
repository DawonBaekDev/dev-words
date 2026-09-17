"use client";

import { useEffect, useRef, useState } from "react";
import QuizText from "@/components/quiz-text";

export default function QuizQuestions({ quiz, formAction, isPending, children }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(() => quiz.questions.map(() => ""));
  const questionRef = useRef(null);
  const question = quiz.questions[questionIndex];
  const isLastQuestion = questionIndex === quiz.questions.length - 1;
  const answeredCount = answers.filter((answer) => answer !== "").length;

  useEffect(() => {
    questionRef.current?.focus();
  }, [questionIndex]);

  function selectAnswer(choiceIndex) {
    setAnswers((previousAnswers) => previousAnswers.map((answer, index) => (
      index === questionIndex ? String(choiceIndex) : answer
    )));

    if (!isLastQuestion) {
      setQuestionIndex(questionIndex + 1);
    }
  }

  return (
    <section aria-labelledby="quiz-question-heading">
      <h2 id="quiz-question-heading">AI 퀴즈</h2>
      <p>카테고리: <strong>{quiz.category}</strong></p>
      <p role="status">문제 {questionIndex + 1} / {quiz.questions.length} · 답변 {answeredCount}개 완료</p>
      <p>답을 선택하면 다음 문제로 이동합니다. 이전·다음 버튼으로 답을 확인하거나 바꿀 수 있습니다.</p>
      <form action={formAction}>
        <input type="hidden" name="quizId" value={quiz.quizId} />
        {answers.map((answer, index) => (
          <input key={index} type="hidden" name={`answer-${index}`} value={answer} />
        ))}
        <fieldset disabled={isPending} key={question.wordId} aria-describedby={`quiz-question-${questionIndex}`}>
          <legend ref={questionRef} tabIndex={-1}>문제 {questionIndex + 1}</legend>
          <div id={`quiz-question-${questionIndex}`}><QuizText text={question.question} /></div>
          {question.choices.map((choice, choiceIndex) => (
            <label key={choice} className="quiz-choice">
              <input
                type="radio"
                name="current-answer"
                value={choiceIndex}
                checked={answers[questionIndex] === String(choiceIndex)}
                onChange={() => selectAnswer(choiceIndex)}
              />
              <QuizText text={choice} inline />
            </label>
          ))}
        </fieldset>
        <div className="form-actions">
          <button type="button" className="secondary-button" disabled={isPending || questionIndex === 0} onClick={() => setQuestionIndex(questionIndex - 1)}>
            이전 문제
          </button>
          <button type="button" className="secondary-button" disabled={isPending || isLastQuestion} onClick={() => setQuestionIndex(questionIndex + 1)}>
            다음 문제
          </button>
          {isLastQuestion && (
            <button type="submit" disabled={isPending || answeredCount !== quiz.questions.length}>
              {isPending ? "채점 중..." : "정답 제출"}
            </button>
          )}
        </div>
        {isLastQuestion && answeredCount !== quiz.questions.length && <p>모든 문제에 답을 선택하면 제출할 수 있습니다.</p>}
        {children}
      </form>
    </section>
  );
}
