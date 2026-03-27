"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() && password.trim();

  const handleLogin = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/setup");
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        alert("ユーザが見つかりません");
      } else if (e.code === "auth/wrong-password") {
        alert("パスワードが違います");
      } else {
        alert("ログイン失敗");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black p-4">
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-sm">
        
        {/* ロゴ */}
        <div className="flex flex-col items-center gap-2">
          <img src="/icon.png" className="w-14 h-14" />
          <h1 className="text-xl font-bold">配車さん</h1>
        </div>

        {/* 入力 */}
        <div className="space-y-3">
          <input
            className="w-full border rounded-xl px-4 py-3 text-base"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full border rounded-xl px-4 py-3 text-base"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
<div style={{ color: "red" }}>NEW BUILD OK</div>
        {/* ログインボタン */}
        <button
          onClick={handleLogin}
          disabled={!canSubmit || loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        {/* 新規登録 */}
        <button
          onClick={() => router.push("/signup")}
          className="w-full border py-3 rounded-xl"
        >
          新規登録へ
        </button>

      </div>
    </main>
  );
}