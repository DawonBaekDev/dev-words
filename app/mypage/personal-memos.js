import StickerIcon from "@/components/sticker-icon";
import Link from "next/link";

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function PersonalMemos({ memos, wordsById }) {
  return (
    <section aria-labelledby="personal-memos-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MY MEMOS</p>
          <h2 id="personal-memos-heading"><StickerIcon name="pencil" /> 개인 메모</h2>
        </div>
        <p>단어카드에서 작성한 메모를 최근 수정한 순서로 모았습니다.</p>
      </div>

      {memos.length === 0 ? (
        <div className="empty-result">
          <p>아직 작성한 개인 메모가 없습니다.</p>
          <p>단어 상세화면에서 기억하고 싶은 내용을 기록해 보세요.</p>
        </div>
      ) : (
        <ul className="personal-memo-list">
          {memos.map((memo) => {
            const word = wordsById.get(memo.wordId);
            return (
              <li key={memo._id.toString()}>
                <article className="personal-memo-card">
                  <header>
                    <div>
                      <p className="word-category">{word?.category ?? "삭제된 단어"}</p>
                      <h3>{word ? <Link href={`/words/${word.slug}`}>{word.name}</Link> : "삭제된 단어"}</h3>
                    </div>
                    <time dateTime={memo.updatedAt.toISOString()}>{formatDateTime(memo.updatedAt)} 수정</time>
                  </header>
                  <p className="personal-memo-content">{memo.content}</p>
                  {word ? (
                    <Link href={`/words/${word.slug}#memo-heading`} className="memo-detail-link">상세화면에서 메모 보기·수정 →</Link>
                  ) : (
                    <p className="deleted-word">연결된 단어가 삭제되어 메모만 보관 중입니다.</p>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
