"use client";

import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

const LOGIN_ERROR_MESSAGE = "이메일 또는 비밀번호를 확인해 주세요.";

export default function AuthControls({ user }) {
  const dialogRef = useRef(null);
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openDialog() {
    setMode("login");
    setMessage("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setMessage("");
  }

  function changeMode() {
    setMode((currentMode) =>
      currentMode === "login" ? "signup" : "login"
    );
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({ email, password });

        if (result.error) {
          setMessage(LOGIN_ERROR_MESSAGE);
          return;
        }
      } else {
        const name = email.split("@")[0] || email;
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });

        if (result.error) {
          setMessage("회원가입 정보를 확인해 주세요.");
          return;
        }
      }

      closeDialog();
      window.location.reload();
    } catch {
      setMessage(
        mode === "login"
          ? LOGIN_ERROR_MESSAGE
          : "회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setMessage("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      window.location.reload();
    } catch {
      setMessage("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="auth-controls">
        <span className="auth-email">{user.email}</span>
        <button type="button" onClick={handleSignOut} disabled={isSubmitting}>
          {isSubmitting ? "로그아웃 중..." : "로그아웃"}
        </button>
        {message && (
          <span className="status-message error" role="alert">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="auth-controls">
      <button id="open-auth-dialog" type="button" onClick={openDialog}>
        로그인
      </button>

      <dialog id="auth-dialog" ref={dialogRef} aria-labelledby="auth-title">
        <div className="dialog-heading">
          <h2 id="auth-title">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <button type="button" onClick={closeDialog} aria-label="모달 닫기">
            닫기
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="auth-email">이메일</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <label htmlFor="auth-password">비밀번호</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={4}
            required
          />

          {message && (
            <p className="status-message error" role="alert">
              {message}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "처리 중..."
                : mode === "login"
                  ? "로그인"
                  : "회원가입"}
            </button>
            <button type="button" onClick={changeMode} disabled={isSubmitting}>
              {mode === "login" ? "회원가입 화면으로" : "로그인 화면으로"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
