"use client";

import StickerIcon from "@/components/sticker-icon";

import { useActionState, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { changeFavorite } from "@/app/activity-actions";

export default function WordActions({ slug, name, description, isUser = false, isFavorite = false, showShare = false }) {
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [kakaoReady, setKakaoReady] = useState(false);
  const [state, favoriteAction, isPending] = useActionState(
    () => changeFavorite(slug, !isFavorite), { message: "" }
  );
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const kakaoEnabled = Boolean(kakaoKey && siteUrl);

  async function copyLink() {
    const url = new URL(`/words/${slug}`, siteUrl || window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했습니다.");
    } catch {
      setMessage(`링크를 복사해 주세요: ${url}`);
    }
  }

  function shareKakao() {
    try {
      if (!window.Kakao?.isInitialized()) window.Kakao.init(kakaoKey);
      const url = new URL(`/words/${slug}`, siteUrl).href;
      window.Kakao.Share.sendDefault({
        objectType: "text",
        text: `${name}\n${description}`.slice(0, 200),
        link: { mobileWebUrl: url, webUrl: url },
        buttonTitle: "단어 상세보기",
      });
    } catch {
      setMessage("카카오톡 공유를 실행하지 못했습니다. 링크 복사를 이용해 주세요.");
    }
  }

  return (
    <div className="word-actions">
      <div className="form-actions">
        {showShare ? (
          <button type="button" aria-expanded={isSharing} onClick={() => setIsSharing(!isSharing)}><StickerIcon name="paperclip" /> 공유</button>
        ) : (
          <Link className="button" href={`/words/${slug}`}>자세히보기</Link>
        )}
        {isUser && <form action={favoriteAction}>
          <button type="submit" aria-pressed={isFavorite} disabled={isPending} className="secondary-cs">
            {isFavorite ? "★ 스크랩 해제" : "☆ 스크랩"}
          </button>
        </form>}
      </div>
      {showShare && isSharing && <div className="form-actions">
        <button type="button" onClick={copyLink}>링크 복사</button>
        <button type="button" onClick={shareKakao} disabled={!kakaoEnabled || !kakaoReady}>카카오톡으로 공유하기</button>
        {!kakaoEnabled && <small>카카오톡 공유는 준비 중입니다.</small>}
        {kakaoEnabled && <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js" onReady={() => setKakaoReady(true)} onError={() => setMessage("카카오톡 공유를 불러오지 못했습니다.")} />}
      </div>}
      {(message || state.type === "error") && (
        <p className={`status-message ${state.type === "error" ? "error" : ""}`} role={state.type === "error" ? "alert" : "status"}>
          {message || state.message}
        </p>
      )}
    </div>
  );
}
