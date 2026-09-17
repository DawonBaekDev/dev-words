import Link from "next/link";
import { findFavoritesByUserInRange, findScrapHistoryByUserInRange } from "@/lib/activity/data";
import { findCompletedQuizzesByUserInRange } from "@/lib/ai/data";
import { QUIZ_QUESTION_COUNT } from "@/lib/ai/validation";
import { findStudyNotesByMonth } from "@/lib/study-calendar/data";
import { getMonthDetails, getSeoulDateKey, isValidDateKey } from "@/lib/study-calendar/date";
import { findWordsByIds } from "@/lib/words/data";
import { deleteStudyNoteAction, saveStudyNoteAction } from "./study-note-actions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function StudyCalendar({ userId, requestedMonth, requestedDay, error, saved, deleted }) {
  const month = getMonthDetails(requestedMonth);
  let selectedDay = `${month.monthKey}-01`;
  if (month.today.startsWith(`${month.monthKey}-`)) selectedDay = month.today;
  if (isValidDateKey(requestedDay) && requestedDay.startsWith(`${month.monthKey}-`)) {
    selectedDay = requestedDay;
  }
  const [notes, quizzes, scrapHistory, favorites] = await Promise.all([
    findStudyNotesByMonth(userId, month.monthKey),
    findCompletedQuizzesByUserInRange(userId, month.start, month.end),
    findScrapHistoryByUserInRange(userId, month.start, month.end),
    findFavoritesByUserInRange(userId, month.start, month.end),
  ]);

  const notesByDay = new Map(notes.map((note) => [note.dateKey, note]));
  const quizzesByDay = new Map();
  for (const quiz of quizzes) {
    const dateKey = getSeoulDateKey(quiz.completedAt);
    const dayQuizzes = quizzesByDay.get(dateKey) ?? [];
    dayQuizzes.push(quiz);
    quizzesByDay.set(dateKey, dayQuizzes);
  }

  // 기존 스크랩은 favorites의 작성 시각으로 표시하고, 새 스크랩은 해제 후에도 남는 이력을 우선 사용합니다.
  const scrapsByDay = new Map();
  const seenScraps = new Set();
  for (const scrap of [...scrapHistory, ...favorites]) {
    const dateKey = getSeoulDateKey(scrap.createdAt);
    const key = `${dateKey}:${scrap.wordId}`;
    if (seenScraps.has(key)) continue;
    seenScraps.add(key);
    const dayScraps = scrapsByDay.get(dateKey) ?? [];
    dayScraps.push(scrap);
    scrapsByDay.set(dateKey, dayScraps);
  }

  const selectedQuizzes = quizzesByDay.get(selectedDay) ?? [];
  const selectedScraps = scrapsByDay.get(selectedDay) ?? [];
  const selectedNote = notesByDay.get(selectedDay);
  const scrapWords = await findWordsByIds(selectedScraps.map((scrap) => scrap.wordId));
  const wordsById = new Map(scrapWords.map((word) => [word._id.toString(), word]));

  return (
    <section id="study-calendar" className="study-calendar" aria-labelledby="study-calendar-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">STUDY JOURNAL</p>
          <h2 id="study-calendar-heading">나의 공부 달력</h2>
        </div>
        <p>공부한 날을 눌러 퀴즈와 스크랩을 돌아보고, 나만의 노트를 남겨보세요.</p>
      </div>

      <div className="calendar-toolbar">
        <Link href={`/mypage?tab=calendar&month=${month.previousMonth}#study-calendar`} aria-label="이전 달">←</Link>
        <h3>{month.year}년 {month.month}월</h3>
        <Link href={`/mypage?tab=calendar&month=${month.nextMonth}#study-calendar`} aria-label="다음 달">→</Link>
      </div>
      <div className="calendar-legend" aria-label="기록 종류">
        <span><i className="calendar-dot note" aria-hidden="true" /> 공부 노트</span>
        <span><i className="calendar-dot quiz" aria-hidden="true" /> 퀴즈</span>
        <span><i className="calendar-dot scrap" aria-hidden="true" /> 스크랩</span>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <ol className="calendar-days">
        {Array.from({ length: month.firstWeekday }, (_, index) => <li key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />)}
        {Array.from({ length: month.lastDay }, (_, index) => {
          const dayNumber = index + 1;
          const dateKey = `${month.monthKey}-${String(dayNumber).padStart(2, "0")}`;
          const noteCount = notesByDay.has(dateKey) ? 1 : 0;
          const quizCount = quizzesByDay.get(dateKey)?.length ?? 0;
          const scrapCount = scrapsByDay.get(dateKey)?.length ?? 0;
          return <li key={dateKey}>
            <Link
              href={`/mypage?tab=calendar&month=${month.monthKey}&day=${dateKey}#study-calendar`}
              className={`calendar-day${dateKey === month.today ? " today" : ""}${dateKey === selectedDay ? " selected" : ""}`}
              aria-current={dateKey === selectedDay ? "date" : undefined}
              aria-label={`${month.month}월 ${dayNumber}일, 노트 ${noteCount}개, 퀴즈 ${quizCount}회, 스크랩 ${scrapCount}개`}
            >
              <span className="calendar-day-number">{dayNumber}</span>
              <span className="calendar-day-dots" aria-hidden="true">
                {noteCount > 0 && <i className="calendar-dot note" />}
                {quizCount > 0 && <i className="calendar-dot quiz" />}
                {scrapCount > 0 && <i className="calendar-dot scrap" />}
              </span>
            </Link>
          </li>;
        })}
      </ol>

      <div className="calendar-day-detail">
        <div className="calendar-selected-heading">
          <div>
            <p className="eyebrow">DAILY NOTE</p>
            <h3>{Number(selectedDay.slice(5, 7))}월 {Number(selectedDay.slice(8, 10))}일의 기록</h3>
          </div>
          <p>퀴즈 {selectedQuizzes.length}회 · 스크랩 {selectedScraps.length}개</p>
        </div>

        {(error === "date" || error === "content") && <p className="status-message error" role="alert">{error === "date" ? "날짜를 다시 선택해 주세요." : "노트를 1~1500자로 입력해 주세요."}</p>}
        {saved === "1" && <p className="status-message success" role="status">공부 노트를 저장했습니다.</p>}
        {deleted === "1" && <p className="status-message success" role="status">공부 노트를 비웠습니다.</p>}

        <div className="calendar-day-columns">
          <div className="calendar-note-card">
            <h4>✏️ 오늘의 공부 노트</h4>
            <form action={saveStudyNoteAction}>
              <input type="hidden" name="dateKey" value={selectedDay} />
              <label htmlFor="study-note-content">배운 내용이나 느낀 점</label>
              <textarea id="study-note-content" name="content" defaultValue={selectedNote?.content ?? ""} maxLength={1500} rows={7} required placeholder="오늘 기억하고 싶은 개념을 적어보세요." />
              <button type="submit">{selectedNote ? "노트 수정하기" : "노트 저장하기"}</button>
            </form>
            {selectedNote && <form action={deleteStudyNoteAction}>
              <input type="hidden" name="dateKey" value={selectedDay} />
              <button type="submit" className="secondary-button">노트 비우기</button>
            </form>}
          </div>

          <div className="calendar-activity-card">
            <h4>📚 이날의 학습 기록</h4>
            {selectedQuizzes.length === 0 && selectedScraps.length === 0 ? (
              <p>이날의 퀴즈나 스크랩 기록이 없습니다.</p>
            ) : (
              <ul className="calendar-activity-list">
                {selectedQuizzes.map((quiz) => <li key={quiz._id.toString()}>
                  <span className="activity-icon quiz" aria-hidden="true">?</span>
                  <div>
                    <strong>{quiz.category ?? "전체"} 퀴즈 · {quiz.score}점 / {QUIZ_QUESTION_COUNT}점</strong>
                    <small>{formatTime(quiz.completedAt)} · 난이도 {quiz.difficulty}</small>
                    <Link href={`/mypage?tab=quiz&quizId=${quiz._id.toString()}#quiz-${quiz._id.toString()}`}>퀴즈 풀이 보기 →</Link>
                  </div>
                </li>)}
                {selectedScraps.map((scrap) => {
                  const word = wordsById.get(scrap.wordId);
                  return <li key={`${selectedDay}-${scrap.wordId}`}>
                    <span className="activity-icon scrap" aria-hidden="true">★</span>
                    <div>
                      <strong>{word?.name ?? "삭제된 단어"} 스크랩</strong>
                      <small>{formatTime(scrap.createdAt)}</small>
                      {word && <Link href={`/words/${word.slug}`}>단어카드 보기 →</Link>}
                    </div>
                  </li>;
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
