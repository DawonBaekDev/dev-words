"use client";

import StickerIcon from "@/components/sticker-icon";

export default function GuestMemoButton() {
  function openLoginDialog() {
    document.getElementById("open-auth-dialog")?.click();
  }

  return (
    <button type="button" onClick={openLoginDialog}>
      <StickerIcon name="pencil" /> 메모하기
    </button>
  );
}
