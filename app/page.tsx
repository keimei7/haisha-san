"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type Mode = "login" | "signup";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  const moveAfterAuth = async (uid: string) => {
    const snap = await getDoc(doc(db, "users", uid));

    if (snap.exists()) {
      window.location.assign("/reserve");
      return;
    }

    window.location.assign("/setup");
  };

const handleLogin = async () => {
  if (!canSubmit || loading) return;

  try {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email.trim(), password);
    window.location.assign("/setup");
  } catch (error: any) {
    console.error("LOGIN ERROR", error);
    alert(`${error.code} / ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleSignup = async () => {
  if (!canSubmit || loading) return;

  try {
    setLoading(true);
    await createUserWithEmailAndPassword(auth, email.trim(), password);
    window.location.assign("/setup");
  } catch (error: any) {
    console.error("SIGNUP ERROR", error);
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
            alt="配車さん"
            className="w-20 h-20 object-contain"
          />
          <div className="text-2xl font-bold tracking-wide">配車さん</div>
          <div className="text-sm text-gray-500">
            社用車・共有車の予約管理
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl py-3 text-sm font-medium transition ${
                mode === "login" ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl py-3 text-sm font-medium transition ${
                mode === "signup" ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              ユーザ登録
            </button>
          </div>

          <div className="space-y-4">
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
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="8文字以上推奨"
              />
            </div>
          </div>

          {mode === "login" ? (
            <button
              type="button"
              onClick={handleLogin}
              disabled={!canSubmit || loading}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium disabled:opacity-50"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignup}
              disabled={!canSubmit || loading}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium disabled:opacity-50"
            >
              {loading ? "登録中..." : "ユーザ登録"}
            </button>
          )}

          <div className="text-xs leading-5 text-gray-500">
            {mode === "login"
              ? "すでに登録済みの方はこちらからログインしてください。"
              : "初めて利用する方はこちらからアカウントを作成してください。"}
          </div>
        </div>
      </div>
    </main>
  );
}