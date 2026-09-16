import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import GuestMemoButton from "./guest-memo-button";
import MemoSection from "./memo-section";
import EditRequestSection from "./edit-request-section";
import AdminWordManagement from "./admin-word-management";
import { getCurrentSession } from "@/lib/auth/session";
import { findMemoByUserAndWord } from "@/lib/memos/data";
import { findPendingWordEditRequest } from "@/lib/word-edit-requests/data";
import { findWordBySlug } from "@/lib/words/data";
import { CODE_LANGUAGE_LABELS } from "@/lib/words/search";

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function WordMeaning({ meaning }) {
  if (typeof meaning !== "string" || !meaning.trim()) {
    return null;
  }

  const [englishWord, ...koreanMeaningParts] = meaning.split(" : ");
  const koreanMeaning = koreanMeaningParts.join(" : ");

  return (
    <p className="word-meaning">
      <strong>{englishWord}</strong>
      {koreanMeaning && ` : ${koreanMeaning}`}
    </p>
  );
}

export default async function WordDetailPage({ params, searchParams }) {
  await connection();

  const { slug } = await params;
  const word = await findWordBySlug(slug);

  if (!word) {
    notFound();
  }

  const session = await getCurrentSession();
  const isGeneralUser = session?.user?.role === "user";
  const [existingMemo, pendingEditRequest] = isGeneralUser
    ? await Promise.all([
        findMemoByUserAndWord(session.user.id, word._id.toString()),
        findPendingWordEditRequest({
          userId: session.user.id,
          wordId: word._id.toString(),
        }),
      ])
    : [null, null];
  const requestedEditRequestId = (await searchParams).editRequestId;
  const editRequestId =
    session?.user?.role === "admin" && typeof requestedEditRequestId === "string"
      ? requestedEditRequestId
      : "";
  const memo = existingMemo
    ? {
        content: existingMemo.content,
        createdAt: formatDateTime(existingMemo.createdAt),
        updatedAt: formatDateTime(existingMemo.updatedAt),
      }
    : null;

  return (
    <main>
      <p>
        <Link href="/">← 단어 목록으로</Link>
      </p>

      <article className="word-detail">
        <header>
          <p className="word-category">{word.category}</p>
          <h2>{word.name}</h2>
          <WordMeaning meaning={word.meaning} />
          {word.tags.length > 0 && (
            <ul className="tag-list" aria-label={`${word.name} 태그`}>
              {word.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
        </header>

        <section aria-labelledby="description-heading">
          <h3 id="description-heading">쉬운 설명</h3>
          <p>{word.description}</p>
        </section>

        <section aria-labelledby="code-example-heading">
          <h3 id="code-example-heading">코드 예시</h3>
          <p className="code-language">
            {CODE_LANGUAGE_LABELS[word.codeLanguage] ?? word.codeLanguage}
          </p>
          <pre>
            <code>{word.codeExample}</code>
          </pre>
        </section>

        {!session?.user && (
          <section className="memo-section" aria-labelledby="memo-heading">
            <h3 id="memo-heading">개인 메모</h3>
            <GuestMemoButton />
          </section>
        )}

        {isGeneralUser && <MemoSection slug={slug} memo={memo} />}
        {isGeneralUser && (
          <EditRequestSection
            slug={slug}
            request={
              pendingEditRequest
                ? { message: pendingEditRequest.message }
                : null
            }
          />
        )}

        {session?.user?.role === "admin" && (
          <AdminWordManagement
            editRequestId={editRequestId}
            word={{
              name: word.name,
              meaning: word.meaning,
              slug: word.slug,
              description: word.description,
              category: word.category,
              tags: word.tags,
              codeExample: word.codeExample,
              codeLanguage: word.codeLanguage,
            }}
          />
        )}
      </article>
    </main>
  );
}
