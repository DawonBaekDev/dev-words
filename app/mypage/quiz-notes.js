import { findCompletedQuizzesByUser } from "@/lib/ai/data";
import { QUIZ_QUESTION_COUNT } from "@/lib/ai/validation";
import QuizText from "@/components/quiz-text";
import { deleteQuizMemoAction, saveQuizMemoAction } from "./quiz-memo-actions";

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function QuizNotes({ userId, error }) {
  const quizzes = await findCompletedQuizzesByUser(userId);

  return (
    <section id="quiz-notes" aria-labelledby="quiz-notes-heading">
      <h2 id="quiz-notes-heading">퀴즈 노트</h2>
      <p>완료한 퀴즈의 점수와 풀이를 다시 보고, 내 생각을 메모할 수 있습니다.</p>
      {error === "invalid" && <p className="status-message error" role="alert">메모를 1~1000자로 입력해 주세요.</p>}
      {error === "missing" && <p className="status-message error" role="alert">해당 퀴즈 기록을 찾을 수 없습니다.</p>}
      {quizzes.length === 0 ? <p>아직 완료한 퀴즈가 없습니다.</p> : quizzes.map((quiz) => {
        const quizId = quiz._id.toString();
        return (
          <details key={quizId} className="request-accordion">
            <summary>{formatDateTime(quiz.completedAt)} · {quiz.category ?? "전체"} · {quiz.score}점 / {QUIZ_QUESTION_COUNT}점</summary>
            <ol className="quiz-question-list">
              {quiz.results.map((result, index) => (
                <li key={`${quizId}-${index}`}>
                  <h3>{index + 1}번 문제</h3>
                  <QuizText text={result.question} />
                  <p>{result.isCorrect ? "정답" : "오답"} · 선택한 답: <QuizText text={result.choices[result.selectedChoiceIndex]} inline /></p>
                  <p>정답: <QuizText text={result.choices[result.correctChoiceIndex]} inline /></p>
                  <p>해설</p>
                  <QuizText text={result.explanation} />
                </li>
              ))}
            </ol>
            <form action={saveQuizMemoAction.bind(null, quizId)}>
              <label htmlFor={`quiz-memo-${quizId}`}>이 퀴즈에 대한 내 메모</label>
              <textarea id={`quiz-memo-${quizId}`} name="memo" defaultValue={quiz.memo ?? ""} maxLength={1000} required rows={4} />
              <button type="submit">메모 저장</button>
            </form>
            {quiz.memo && (
              <form action={deleteQuizMemoAction.bind(null, quizId)}>
                <button type="submit" className="secondary-button">메모 삭제</button>
              </form>
            )}
          </details>
        );
      })}
    </section>
  );
}
