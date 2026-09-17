import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import AdminEditRequestItem from "./edit-request-item";
import AdminWordRequestGroup from "./word-request-group";
import WordHistory from "./word-history";
import DeleteWord from "./delete-word";
import AdminWordForm from "./word-form";
import { findPendingWordEditRequests } from "@/lib/word-edit-requests/data";
import { findRequestGroups } from "@/lib/word-requests/data";
import { findWordsByIds, findAdminWordHistory } from "@/lib/words/data";

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

  const [allGroups, editRequests, words] = await Promise.all([
    findRequestGroups(),
    findPendingWordEditRequests(),
    findAdminWordHistory(),
  ]);
  const activeWords = words.filter((word) => !word.deletedAt);
  const requestGroups = allGroups.filter((group) => group.status === "pending");
  const previousGroups = allGroups.filter((group) => group.status !== "pending");
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

      </section>

      <details open className="request-accordion">
        <summary>신규 등록 요청 · 검증 대기중 {pendingRequestCount}건</summary>

        {requestGroups.length === 0 ? (
          <p>현재 확인할 새 단어 요청이 없습니다.</p>
        ) : (
          <ul className="request-list admin-request-list">
            {requestGroups.map((group) => (
              <li key={group.normalizedWord}>
                <AdminWordRequestGroup
                  group={{
                    normalizedWord: group.normalizedWord,
                    draft: group.requests.find((request) => request.draft)?.draft ?? null,
                    message: group.requests.some((request) => request.draft) ? "해당 카드를 등록할까요?" : "자동생성 실패. 관리자 확인요망",
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

      <details className="request-accordion">
        <summary>이전 등록 요청 내역</summary>
        {previousGroups.length === 0 ? <p>처리된 요청이 없습니다.</p> : <ul className="request-list">
          {previousGroups.map((group) => <li key={`${group.normalizedWord}-${group.status}`}>
            <article className="request-card">
              <h3>{group.requestedWord}</h3>
              <p>{group.status === "completed" ? "처리완료" : "등록불가"} · {group.requestCount}건</p>
              {group.requests.map((request) => <p key={request._id.toString()}>
                {formatDateTime(request.updatedAt)}{request.rejectionReason && ` · ${request.rejectionReason}`}
              </p>)}
            </article>
          </li>)}
        </ul>}
      </details>

      <details className="request-accordion">
        <summary>등록된 단어 관리 · {activeWords.length}개</summary>
        <AdminWordForm />
        <ul className="request-list">
          {activeWords.map((word) => <li key={word._id.toString()}>
            <article className="request-card">
              <h3><Link href={`/words/${word.slug}`}>{word.name}</Link></h3>
              <p>{word.source} · {formatDateTime(word.createdAt)}</p>
              <p>{word.description}</p>
              <div className="form-actions">
                <Link href={`/words/${word.slug}?edit=true`}>수정</Link>
                <DeleteWord slug={word.slug} />
              </div>
            </article>
          </li>)}
        </ul>
      </details>

      <WordHistory words={words} />

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
