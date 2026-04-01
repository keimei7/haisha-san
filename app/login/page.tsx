"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  const handleLogin = async () => {
    if (!canSubmit || loading) return;

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.replace("/");
    } catch (error: any) {
      console.error("LOGIN ERROR", error);
      alert(`${error.code} / ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      alert("メールアドレスを入力してください");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      alert("パスワード再設定メールを送信しました。メールをご確認ください。");
    } catch (error: any) {
      console.error("RESET ERROR", error);
      alert(`${error.code} / ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-3 border-b">
          <img
            src="/icon.png"
            alt="gotab"
            className="w-20 h-20 object-contain"
          />
          <div className="text-2xl font-bold tracking-wide">gotab</div>
          <div className="text-sm text-gray-500">
            ログインして予約画面へ進みます
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">
              メールアドレス
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">
              パスワード
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="パスワード"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={!canSubmit || loading}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full text-sm text-blue-600 underline disabled:opacity-50"
          >
            パスワードを忘れた場合
          </button>

          <button
            type="button"
            onClick={() => window.location.assign("/signup")}
            className="w-full rounded-2xl border border-gray-300 py-3.5 font-medium"
          >
            新規登録はこちら
          </button>
        </div>
      </div>
    </main>
  );
}