import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import WordRequestItem from "./word-request-item";
import { getCurrentSession } from "@/lib/auth/session";
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

  const requests = await findWordRequestsByUser(session.user.id);
  const linkedWordIds = [
    ...new Set(
      requests
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
    </main>
  );
}
