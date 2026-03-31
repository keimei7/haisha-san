"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type Mode = "login" | "signup";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  // 🔥 すでにログイン済みなら即ルートへ
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        window.location.replace("/");
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    if (!canSubmit || loading) return;

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // 🔥 ここだけ変更
      window.location.replace("/");
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

      // 🔥 ここだけ変更
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
          <img src="/icon.png" className="w-20 h-20 object-contain" />
          <div className="text-2xl font-bold">配車さん</div>
          <div className="text-sm text-gray-500">
            社用車・共有車の予約管理
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            <button
              onClick={() => setMode("login")}
              className={`rounded-xl py-3 text-sm ${
                mode === "login" ? "bg-white" : "text-gray-500"
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`rounded-xl py-3 text-sm ${
                mode === "signup" ? "bg-white" : "text-gray-500"
              }`}
            >
              ユーザ登録
            </button>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
            placeholder="メール"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
            placeholder="パスワード"
          />

          <button
            onClick={mode === "login" ? handleLogin : handleSignup}
            disabled={!canSubmit || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl"
          >
            {loading
              ? "処理中..."
              : mode === "login"
              ? "ログイン"
              : "ユーザ登録"}
          </button>
        </div>
      </div>
    </main>
  );
}