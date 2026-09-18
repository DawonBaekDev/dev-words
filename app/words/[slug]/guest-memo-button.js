"use client";


export default function GuestMemoButton() {
  function openLoginDialog() {
    document.getElementById("open-auth-dialog")?.click();
  }

  return (
    <button type="button" onClick={openLoginDialog}>
      메모하기
    </button>
  );
}
