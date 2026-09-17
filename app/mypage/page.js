import WordActions from "@/components/word-actions";
import { findFavorites, findRecentWords } from "@/lib/activity/data";
import { deleteRecentWord } from "@/app/activity-actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import WordRequestItem from "./word-request-item";
import EditRequestItem from "./edit-request-item";
import PersonalMemos from "./personal-memos";
import QuizNotes from "./quiz-notes";
import StudyCalendar from "./study-calendar";
import { getCurrentSession } from "@/lib/auth/session";
import { findMemosByUser } from "@/lib/memos/data";
import { findWordEditRequestsByUser } from "@/lib/word-edit-requests/data";
import { findWordRequestsByUser } from "@/lib/word-requests/data";
import { findWordsByIds } from "@/lib/words/data";

export const metadata = {
  title: "마이페이지",
};

const MY_PAGE_TABS = ["calendar", "scraps", "recent", "memos", "quiz", "requests"];

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function MyPage({ searchParams }) {
  await connection();

  const session = await getCurrentSession();
  const pageSearchParams = await searchParams;
  const requestedTab = Array.isArray(pageSearchParams?.tab)
    ? pageSearchParams.tab[0]
    : pageSearchParams?.tab;
  const selectedTab = MY_PAGE_TABS.includes(requestedTab)
    ? requestedTab
    : "calendar";
  const quizMemoError = pageSearchParams?.quizMemoError;
  const calendarMonth = Array.isArray(pageSearchParams?.month) ? pageSearchParams.month[0] : pageSearchParams?.month;
  const calendarDay = Array.isArray(pageSearchParams?.day) ? pageSearchParams.day[0] : pageSearchParams?.day;

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  const [requests, editRequests, favorites, recentWords, memos] = await Promise.all([
    findWordRequestsByUser(session.user.id),
    findWordEditRequestsByUser(session.user.id),
    findFavorites(session.user.id),
    findRecentWords(session.user.id),
    findMemosByUser(session.user.id),
  ]);
  const linkedWordIds = [
    ...new Set(
      [...requests, ...editRequests, ...favorites, ...recentWords, ...memos]
        .map((request) => request.wordId)
        .filter((wordId) => typeof wordId === "string")
    ),
  ];
  const linkedWords = await findWordsByIds(linkedWordIds);
  const wordsById = new Map(
    linkedWords.map((word) => [word._id.toString(), word])
  );
  const favoriteWords = favorites.filter((favorite) => wordsById.has(favorite.wordId));
  const pendingRequestCount = [...requests, ...editRequests].filter(
    (request) => request.status === "pending"
  ).length;

  return (
    <main className="account-page">
      <p className="back-link">
        <Link href="/">← 단어 목록으로</Link>
      </p>

      <section className="account-hero" aria-labelledby="mypage-heading">
        <div>
          <p className="eyebrow">MY LEARNING</p>
          <h2 id="mypage-heading">마이페이지</h2>
          <p>{session.user.email}님의 학습 기록과 요청 내역을 한곳에서 확인하세요.</p>
        </div>
        <Link href="/quiz" role="button">AI 퀴즈 시작</Link>
        <dl className="account-stats">
          <div><dt>스크랩</dt><dd>{favoriteWords.length}</dd></div>
          <div><dt>최근 본 단어</dt><dd>{recentWords.length}</dd></div>
          <div><dt>개인 메모</dt><dd>{memos.length}</dd></div>
          <div><dt>처리 대기 요청</dt><dd>{pendingRequestCount}</dd></div>
        </dl>
      </section>

      <nav className="account-tabs" aria-label="마이페이지 메뉴">
        <Link href="/mypage?tab=calendar" aria-current={selectedTab === "calendar" ? "page" : undefined}>공부 달력</Link>
        <Link href="/mypage?tab=scraps" aria-current={selectedTab === "scraps" ? "page" : undefined}>스크랩 <span>{favoriteWords.length}</span></Link>
        <Link href="/mypage?tab=recent" aria-current={selectedTab === "recent" ? "page" : undefined}>최근 본 단어 <span>{recentWords.length}</span></Link>
        <Link href="/mypage?tab=memos" aria-current={selectedTab === "memos" ? "page" : undefined}>개인 메모 <span>{memos.length}</span></Link>
        <Link href="/mypage?tab=quiz" aria-current={selectedTab === "quiz" ? "page" : undefined}>퀴즈 노트</Link>
        <Link href="/mypage?tab=requests" aria-current={selectedTab === "requests" ? "page" : undefined}>요청 내역 <span>{requests.length + editRequests.length}</span></Link>
      </nav>

      {selectedTab === "calendar" && <section className="account-panel account-calendar-panel">
        <StudyCalendar
          userId={session.user.id}
          requestedMonth={calendarMonth}
          requestedDay={calendarDay}
          error={pageSearchParams?.error}
          saved={pageSearchParams?.saved}
          deleted={pageSearchParams?.deleted}
        />
      </section>}

      {selectedTab === "scraps" && <section className="account-panel" aria-labelledby="scraps-heading">
        <div className="panel-heading">
          <div><p className="eyebrow">SAVED WORDS</p><h2 id="scraps-heading">스크랩한 단어카드</h2></div>
          <p>최근 스크랩한 순서로 표시합니다.</p>
        </div>
        {favoriteWords.length === 0 && <div className="empty-result"><p>스크랩한 단어카드가 없습니다.</p><p>단어 목록에서 별표 버튼을 눌러 저장해 보세요.</p></div>}
        <ul className="word-list">
          {favoriteWords.map((favorite) => {
            const word = wordsById.get(favorite.wordId);
            return <li key={favorite.wordId}>
              <article>
                <p className="word-category">{word.category}</p>
                <h3><Link href={`/words/${word.slug}`}>{word.name}</Link></h3>
                <p>{word.description}</p>
                <WordActions slug={word.slug} name={word.name} description={word.description} isUser isFavorite />
              </article>
            </li>;
          })}
        </ul>
      </section>}

      {selectedTab === "recent" && <section className="account-panel" aria-labelledby="recent-words-heading">
        <div className="panel-heading">
          <div><p className="eyebrow">RECENTLY VIEWED</p><h2 id="recent-words-heading">최근 본 단어카드</h2></div>
          {recentWords.length > 0 && <form action={deleteRecentWord.bind(null, null)}><button type="submit" className="secondary-button">최근 기록 모두 삭제</button></form>}
        </div>
        {recentWords.length === 0 ? <p>최근 본 단어카드가 없습니다.</p> : <>
          <ul className="recent-word-list">
            {recentWords.map((recent) => {
              const word = wordsById.get(recent.wordId);
              return <li key={recent.wordId}>
                <div>
                  {word ? <Link href={`/words/${word.slug}`}>{word.name}</Link> : <span>삭제된 단어</span>}
                  {word && <small>{word.category}</small>}
                </div>
                <form action={deleteRecentWord.bind(null, recent.wordId)}>
                  <button type="submit" aria-label={`${word?.name ?? "삭제된 단어"} 최근 기록 삭제`}>×</button>
                </form>
              </li>;
            })}
          </ul>
        </>}
      </section>}

      {selectedTab === "memos" && <section className="account-panel account-memo-panel"><PersonalMemos memos={memos} wordsById={wordsById} /></section>}

      {selectedTab === "quiz" && <section className="account-panel account-quiz-panel"><QuizNotes userId={session.user.id} error={quizMemoError} openedQuizId={pageSearchParams?.quizId} /></section>}

      {selectedTab === "requests" && <section className="account-panel" aria-labelledby="requests-heading">
        <div className="panel-heading"><div><p className="eyebrow">MY REQUESTS</p><h2 id="requests-heading">요청 내역</h2></div><p>처리 상태와 관리자 답변을 확인하세요.</p></div>
        <details open className="request-accordion">
          <summary>새 단어 요청 <span>{requests.length}</span></summary>

        {requests.length === 0 ? (
          <p>아직 새 단어 요청 내역이 없습니다.</p>
        ) : (
          <ul className="request-list">
            {requests.map((request) => {
              const linkedWord = request.wordId
                ? wordsById.get(request.wordId)
                : null;

              return (
                <li key={request._id.toString()}>
                  <WordRequestItem
                    request={{
                      id: request._id.toString(),
                      requestedWord: request.requestedWord,
                      status: request.status,
                      rejectionReason: request.rejectionReason ?? "",
                      createdAt: formatDateTime(request.createdAt),
                      updatedAt: formatDateTime(request.updatedAt),
                      wordSlug: linkedWord?.slug ?? "",
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
        </details>

        <details className="request-accordion">
          <summary>기존 단어 수정 요청 <span>{editRequests.length}</span></summary>

        {editRequests.length === 0 ? (
          <p>아직 기존 단어 수정 요청 내역이 없습니다.</p>
        ) : (
          <ul className="request-list">
            {editRequests.map((request) => {
              const linkedWord = wordsById.get(request.wordId);

              return (
                <li key={request._id.toString()}>
                  <EditRequestItem
                    request={{
                      id: request._id.toString(),
                      message: request.message,
                      status: request.status,
                      rejectionReason: request.rejectionReason ?? "",
                      createdAt: formatDateTime(request.createdAt),
                      updatedAt: formatDateTime(request.updatedAt),
                      wordName: linkedWord?.name ?? "",
                      wordSlug: linkedWord?.slug ?? "",
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
        </details>
      </section>}
    </main>
  );
}
