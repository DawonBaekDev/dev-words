import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { findPendingWordRequestGroups } from "@/lib/word-requests/data";

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

  const requestGroups = await findPendingWordRequestGroups();
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
        <summary>새 단어 요청 {pendingRequestCount}건</summary>

        {requestGroups.length === 0 ? (
          <p>현재 확인할 새 단어 요청이 없습니다.</p>
        ) : (
          <ul className="request-list admin-request-list">
            {requestGroups.map((group) => (
              <li key={group._id}>
                <article className="request-card">
                  <div className="request-heading">
                    <h3>{group.requestedWord}</h3>
                    <span className="request-status pending">처리 중</span>
                  </div>
                  <p>
                    <strong>요청 인원:</strong> {group.requestCount}명
                  </p>
                  <dl className="request-dates">
                    <div>
                      <dt>첫 요청</dt>
                      <dd>{formatDateTime(group.firstRequestedAt)}</dd>
                    </div>
                    <div>
                      <dt>최근 요청</dt>
                      <dd>{formatDateTime(group.lastRequestedAt)}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        )}
      </details>
    </main>
  );
}
