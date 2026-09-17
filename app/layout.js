import Link from "next/link";
import "simpledotcss/simple.css";
import "./globals.css";
import AuthControls from "@/components/auth-controls";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = {
  title: {
    default: "개린이의 단어장",
    template: "%s | 개린이의 단어장",
  },
  description: "웹 개발 용어를 쉬운 설명과 코드 예시로 학습하는 단어장",
};

export default async function RootLayout({ children }) {
  const session = await getCurrentSession();
  const user = session?.user
    ? {
        email: session.user.email,
        role: session.user.role,
      }
    : null;

  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <header>
          <nav aria-label="주요 메뉴" className="site-nav">
            <Link href="/">📝 개<small>(발자,어)</small>린이의 단어장</Link>
            <AuthControls user={user} />
          </nav>
          {user && (
            <h5 className="user-name">{user.email} 님 안녕하세요!</h5>
          )}
          <h1>낯선 개발 용어를 하나씩 익혀 보세요.</h1>
          <p>초보 학습자를 위한 쉬운 설명과 짧은 코드 예시를 제공합니다.</p>
        </header>
        {children}
        <footer>
          <p>개발자 단어장 · 학습용 웹 서비스 / 조원: 임지연, 백다원</p>
        </footer>
      </body>
    </html>
  );
}
