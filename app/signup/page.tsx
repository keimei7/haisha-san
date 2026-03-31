"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  const handleSignup = async () => {
    if (!canSubmit || loading) return;

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      window.location.replace("/");
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
            新規アカウントを作成
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3"
              placeholder="パスワード"
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={!canSubmit || loading}
            className="w-full rounded-2xl bg-blue-600 py-3 text-white disabled:opacity-50"
          >
            {loading ? "登録中..." : "登録"}
          </button>

          <button
            onClick={() => window.location.assign("/login")}
            className="w-full rounded-2xl border py-3"
          >
            ログインへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}