import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import AdminEditRequestItem from "./edit-request-item";
import AdminWordRequestGroup from "./word-request-group";
import AdminWordForm from "./word-form";
import { findPendingWordEditRequests } from "@/lib/word-edit-requests/data";
import { findPendingWordRequestGroups } from "@/lib/word-requests/data";
import { findWordsByIds } from "@/lib/words/data";

export const metadata = {
  title: "관리자 페이지",
};

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminPage() {
  await connection();

  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "admin") {
    redirect("/mypage");
  }

  const [requestGroups, editRequests] = await Promise.all([
    findPendingWordRequestGroups(),
    findPendingWordEditRequests(),
  ]);
  const editedWords = await findWordsByIds(
    editRequests.map((request) => request.wordId)
  );
  const wordsById = new Map(
    editedWords.map((word) => [word._id.toString(), word])
  );
  const pendingRequestCount = requestGroups.reduce(
    (total, group) => total + group.requestCount,
    0
  );

  return (
    <main>
      <p>
        <Link href="/">← 단어 목록으로</Link>
      </p>

      <section aria-labelledby="admin-heading">
        <h2 id="admin-heading">관리자 페이지</h2>
        <p>사용자가 요청한 새 단어 알림을 최신 요청부터 확인하세요.</p>
        <p>
          <Link href="/quiz">AI 퀴즈</Link>
        </p>
        <AdminWordForm />
      </section>

      <details open className="request-accordion">
        <summary>새 단어 요청 {pendingRequestCount}건</summary>

        {requestGroups.length === 0 ? (
          <p>현재 확인할 새 단어 요청이 없습니다.</p>
        ) : (
          <ul className="request-list admin-request-list">
            {requestGroups.map((group) => (
              <li key={group._id}>
                <AdminWordRequestGroup
                  group={{
                    normalizedWord: group._id,
                    requestedWord: group.requestedWord,
                    requestCount: group.requestCount,
                    firstRequestedAt: formatDateTime(group.firstRequestedAt),
                    lastRequestedAt: formatDateTime(group.lastRequestedAt),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </details>

      <details open className="request-accordion">
        <summary>기존 단어 수정 요청 {editRequests.length}건</summary>

        {editRequests.length === 0 ? (
          <p>현재 확인할 기존 단어 수정 요청이 없습니다.</p>
        ) : (
          <ul className="request-list admin-request-list">
            {editRequests.map((request) => {
              const word = wordsById.get(request.wordId);

              return (
                <li key={request._id.toString()}>
                  <AdminEditRequestItem
                    request={{
                      id: request._id.toString(),
                      message: request.message,
                      createdAt: formatDateTime(request.createdAt),
                      updatedAt: formatDateTime(request.updatedAt),
                      wordName: word?.name ?? "",
                      wordSlug: word?.slug ?? "",
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
