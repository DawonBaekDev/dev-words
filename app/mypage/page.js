import WordActions from "@/components/word-actions";
import { findFavorites, findRecentWords } from "@/lib/activity/data";
import { deleteRecentWord } from "@/app/activity-actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import WordRequestItem from "./word-request-item";
import EditRequestItem from "./edit-request-item";
import { getCurrentSession } from "@/lib/auth/session";
import { findWordEditRequestsByUser } from "@/lib/word-edit-requests/data";
import { findWordRequestsByUser } from "@/lib/word-requests/data";
import { findWordsByIds } from "@/lib/words/data";

export const metadata = {
  title: "마이페이지",
};

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function MyPage() {
  await connection();

  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  const [requests, editRequests, favorites, recentWords] = await Promise.all([
    findWordRequestsByUser(session.user.id),
    findWordEditRequestsByUser(session.user.id),
    findFavorites(session.user.id),
    findRecentWords(session.user.id),
  ]);
  const linkedWordIds = [
    ...new Set(
      [...requests, ...editRequests, ...favorites, ...recentWords]
        .map((request) => request.wordId)
        .filter((wordId) => typeof wordId === "string")
    ),
  ];
  const linkedWords = await findWordsByIds(linkedWordIds);
  const wordsById = new Map(
    linkedWords.map((word) => [word._id.toString(), word])
  );

  return (
    <main>
      <p>
        <Link href="/">← 단어 목록으로</Link>
      </p>

      <section aria-labelledby="mypage-heading">
        <h2 id="mypage-heading">마이페이지</h2>
        <p>{session.user.email}님의 새 단어 요청 처리 상태를 확인하세요.</p>
        <p><Link href="/quiz">AI 퀴즈</Link></p>
      </section>

      <details open className="request-accordion">
        <summary>스크랩한 단어카드 · 목록보기</summary>
        {favorites.filter((favorite) => wordsById.has(favorite.wordId)).length === 0 && <p>스크랩한 단어카드가 없습니다.</p>}
        <ul className="word-list">
          {favorites.map((favorite) => {
            const word = wordsById.get(favorite.wordId);
            if (!word) return null;
            return <li key={favorite.wordId}>
              <h3><Link href={`/words/${word.slug}`}>{word.name}</Link></h3>
              <p>{word.description}</p>
              <WordActions slug={word.slug} name={word.name} description={word.description} isUser isFavorite />
            </li>;
          })}
        </ul>
      </details>

      <section aria-labelledby="recent-words-heading">
        <h2 id="recent-words-heading">최근 본 단어카드</h2>
        {recentWords.length === 0 ? <p>최근 본 단어카드가 없습니다.</p> : <>
          <form action={deleteRecentWord.bind(null, null)}><button type="submit">최근 기록 모두 삭제</button></form>
          <ul className="request-list">
            {recentWords.map((recent) => {
              const word = wordsById.get(recent.wordId);
              return <li key={recent.wordId} className="section-heading">
                {word ? <Link href={`/words/${word.slug}`}>{word.name}</Link> : <span>삭제된 단어</span>}
                <form action={deleteRecentWord.bind(null, recent.wordId)}>
                  <button type="submit" aria-label={`${word?.name ?? "삭제된 단어"} 최근 기록 삭제`}>×</button>
                </form>
              </li>;
            })}
          </ul>
        </>}
      </section>

      <details open className="request-accordion">
        <summary>새 단어 요청 내역 {requests.length}건</summary>

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

      <details open className="request-accordion">
        <summary>기존 단어 수정 요청 내역 {editRequests.length}건</summary>

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
    </main>
  );
}
