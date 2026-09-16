import Link from "next/link";

export default function WordNotFound() {
  return (
    <main>
      <h2>단어를 찾을 수 없습니다.</h2>
      <p>삭제되었거나 존재하지 않는 단어 주소입니다.</p>
      <Link href="/" role="button">
        단어 목록으로 돌아가기
      </Link>
    </main>
  );
}
