import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { findWordBySlug } from "@/lib/words/data";
import { CODE_LANGUAGE_LABELS } from "@/lib/words/search";

export default async function WordDetailPage({ params }) {
  await connection();

  const { slug } = await params;
  const word = await findWordBySlug(slug);

  if (!word) {
    notFound();
  }

  return (
    <main>
      <p>
        <Link href="/">← 단어 목록으로</Link>
      </p>

      <article className="word-detail">
        <header>
          <p className="word-category">{word.category}</p>
          <h2>{word.name}</h2>
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
      </article>
    </main>
  );
}
