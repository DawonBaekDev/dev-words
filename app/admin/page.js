import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { findUserEmailsByIds } from "@/lib/auth/users";
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

const ADMIN_TABS = ["new", "edit", "words", "history", "processed"];

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminPage({ searchParams }) {
  await connection();

  const pageSearchParams = await searchParams;
  const source = pageSearchParams?.source;
  const selectedSource = typeof source === "string" && ["AI요청", "관리자 작성", "초기 데이터"].includes(source)
    ? source : "전체";
  const requestedTab = Array.isArray(pageSearchParams?.tab)
    ? pageSearchParams.tab[0]
    : pageSearchParams?.tab;
  const selectedTab = ADMIN_TABS.includes(requestedTab)
    ? requestedTab
    : "new";

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
  const userEmailsById = await findUserEmailsByIds([
    ...allGroups.flatMap((group) => group.requests.map((request) => request.userId)),
    ...editRequests.map((request) => request.userId),
  ]);
  const wordsById = new Map(
    editedWords.map((word) => [word._id.toString(), word])
  );
  const pendingRequestCount = requestGroups.reduce(
    (total, group) => total + group.requestCount,
    0
  );

  return (
    <main className="account-page admin-page">
      <p className="back-link">
        <Link href="/">← 단어 목록으로</Link>
      </p>

      <section className="account-hero admin-hero" aria-labelledby="admin-heading">
        <div>
          <p className="eyebrow">ADMIN DASHBOARD</p>
          <h2 id="admin-heading">관리자 페이지</h2>
          <p>단어 요청 검토와 사전 관리를 탭별로 빠르게 처리하세요.</p>
        </div>
        <dl className="account-stats">
          <div><dt>신규 요청</dt><dd>{pendingRequestCount}</dd></div>
          <div><dt>수정 요청</dt><dd>{editRequests.length}</dd></div>
          <div><dt>등록 단어</dt><dd>{activeWords.length}</dd></div>
        </dl>
      </section>

      <nav className="account-tabs admin-tabs" aria-label="관리자 페이지 메뉴">
        <Link href="/admin?tab=new" aria-current={selectedTab === "new" ? "page" : undefined}>신규 요청 <span>{pendingRequestCount}</span></Link>
        <Link href="/admin?tab=edit" aria-current={selectedTab === "edit" ? "page" : undefined}>수정 요청 <span>{editRequests.length}</span></Link>
        <Link href="/admin?tab=words" aria-current={selectedTab === "words" ? "page" : undefined}>단어 관리 <span>{activeWords.length}</span></Link>
        <Link href="/admin?tab=history" aria-current={selectedTab === "history" ? "page" : undefined}>변경 이력</Link>
        <Link href="/admin?tab=processed" aria-current={selectedTab === "processed" ? "page" : undefined}>처리 내역 <span>{previousGroups.length}</span></Link>
      </nav>

      {selectedTab === "new" && <section className="account-panel" aria-labelledby="new-requests-heading">
        <div className="panel-heading"><div><p className="eyebrow">PENDING REQUESTS</p><h2 id="new-requests-heading">신규 등록 요청</h2></div><p>AI 초안을 확인하고 승인하거나 등록불가로 처리하세요.</p></div>

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
                    requesters: group.requests.map((request) => ({
                      id: request._id.toString(),
                      email: userEmailsById.get(request.userId) ?? `사용자 ID: ${request.userId}`,
                      requestedAt: formatDateTime(request.createdAt),
                    })),
                    firstRequestedAt: formatDateTime(group.firstRequestedAt),
                    lastRequestedAt: formatDateTime(group.lastRequestedAt),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>}

      {selectedTab === "processed" && <section className="account-panel" aria-labelledby="processed-heading">
        <div className="panel-heading"><div><p className="eyebrow">PROCESSED</p><h2 id="processed-heading">이전 등록 요청 내역</h2></div><p>완료·등록불가 처리된 요청입니다.</p></div>
        {previousGroups.length === 0 ? <p>처리된 요청이 없습니다.</p> : <ul className="request-list">
          {previousGroups.map((group) => <li key={`${group.normalizedWord}-${group.status}`}>
            <article className="request-card">
              <h3>{group.requestedWord}</h3>
              <p>{group.status === "completed" ? "처리완료" : "등록불가"} · {group.requestCount}건</p>
              {group.requests.map((request) => <p key={request._id.toString()}>
                {userEmailsById.get(request.userId) ?? `사용자 ID: ${request.userId}`} · {formatDateTime(request.updatedAt)}{request.rejectionReason && ` · ${request.rejectionReason}`}
              </p>)}
            </article>
          </li>)}
        </ul>}
      </section>}

      {selectedTab === "words" && <section className="account-panel" aria-labelledby="word-management-heading">
        <div className="panel-heading">
          <div><p className="eyebrow">DICTIONARY</p><h2 id="word-management-heading">등록된 단어 관리</h2></div>
          <AdminWordForm />
        </div>
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
      </section>}

      {selectedTab === "history" && <section className="account-panel history-panel" aria-label="단어 변경 이력">
        <WordHistory words={words} selectedSource={selectedSource} />
      </section>}

      {selectedTab === "edit" && <section className="account-panel" aria-labelledby="edit-requests-heading">
        <div className="panel-heading"><div><p className="eyebrow">EDIT REQUESTS</p><h2 id="edit-requests-heading">기존 단어 수정 요청</h2></div><p>사용자 의견을 확인하고 단어를 수정하거나 요청을 거절하세요.</p></div>

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
                      userEmail: userEmailsById.get(request.userId) ?? `사용자 ID: ${request.userId}`,
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
      </section>}
    </main>
  );
}
