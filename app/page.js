import Link from "next/link";
import { connection } from "next/server";
import QuizEntry from "./quiz-entry";
import NewWordRequest from "./new-word-request";
import WordActions from "@/components/word-actions";
import { findFavorites } from "@/lib/activity/data";
import { getCurrentSession } from "@/lib/auth/session";
import { findWords } from "@/lib/words/data";
import {
  normalizeWordSearchParams,
  WORD_CATEGORIES,
} from "@/lib/words/search";

export default async function Home({ searchParams }) {
  await connection();

  const filters = normalizeWordSearchParams(await searchParams);
  const [words, session] = await Promise.all([
    findWords(filters),
    getCurrentSession(),
  ]);

  const favorites = session?.user?.role === "user" ? await findFavorites(session.user.id) : [];
  const favoriteIds = new Set(favorites.map((favorite) => favorite.wordId));

  return (
    <main>
      {session?.user?.role !== "admin" && (
        <section className="quiz-banner" aria-labelledby="home-quiz-heading">
          <div>
            <h2 id="home-quiz-heading">배운 단어, 퀴즈로 확인해 볼까요?</h2>
            <p>AI가 만드는 랜덤 5문제 · 하루 5회 도전</p>
          </div>
          <QuizEntry isLoggedIn={session?.user?.role === "user"} />
        </section>
      )}
      <section aria-labelledby="word-search-heading">
        <h2 id="word-search-heading">단어 검색</h2>
        <form action="/" method="get" className="search-form">
          <label htmlFor="query">검색어</label>
          <input
            id="query"
            name="query"
            type="search"
            defaultValue={filters.query}
            placeholder="예: HTTP, 요청, 컴포넌트"
          />

          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            name="category"
            defaultValue={filters.category}
          >
            <option value="">전체 카테고리</option>
            {WORD_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <div className="search-actions">
            <button type="submit">검색</button>
            {(filters.query || filters.category) && (
              <Link href="/" role="button" className="secondary-button">
                초기화
              </Link>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="word-list-heading">
        <div className="section-heading">
          <h2 id="word-list-heading">단어 목록</h2>
          <p aria-live="polite">총 {words.length}개</p>
        </div>

        {words.length === 0 ? (
          <div className="empty-result">
            <p>
              {filters.query
                ? `“${filters.query}”에 대한 검색 결과가 없습니다.`
                : "선택한 조건에 맞는 단어가 없습니다."}
            </p>
            <p>
              검색어의 철자를 확인하거나 전체 카테고리에서 다시 찾아보세요.
            </p>
            {filters.query && (
              <div className="empty-result-actions">
                <NewWordRequest
                  query={filters.query}
                  userRole={session?.user?.role ?? null}
                />
              </div>
            )}
          </div>
        ) : (
          <ul className="word-list">
            {words.map((word) => (
              <li key={word._id.toString()}>
                <article>
                  <p className="word-category">{word.category}</p>
                  <h3>
                    <Link href={`/words/${word.slug}`}>{word.name}</Link>
                  </h3>
                  <p>{word.description}</p>
                  {word.tags.length > 0 && (
                    <ul className="tag-list" aria-label={`${word.name} 태그`}>
                      {word.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  )}
                  <WordActions slug={word.slug} name={word.name} description={word.description} isUser={session?.user?.role === "user"} isFavorite={favoriteIds.has(word._id.toString())} />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
