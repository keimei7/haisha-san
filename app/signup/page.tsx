"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    email.trim() !== "" &&
    password.trim() !== "" &&
    passwordConfirm.trim() !== "";

  const handleSignup = async () => {
    if (!canSubmit || loading) return;

    if (password !== passwordConfirm) {
      alert("パスワード確認が一致しません");
      return;
    }

    if (password.length < 6) {
      alert("パスワードは6文字以上にしてください");
      return;
    }

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = cred.user;
      const now = new Date().toISOString();

      await setDoc(doc(db, "users", user.uid), {
        email: user.email ?? "",
        displayName: "",
        companyId: "",
        role: "member",
        createdAt: now,
        updatedAt: now,
      });

      window.location.replace("/setup");
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
            alt=""
            className="w-20 h-20 object-contain"
          />
          <div className="text-2xl font-bold tracking-wide"></div>
          <div className="text-sm text-gray-500">
            新規登録して初期設定へ進みます
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="6文字以上"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">
              パスワード確認
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="もう一度入力"
            />
          </div>

          <button
            type="button"
            onClick={handleSignup}
            disabled={!canSubmit || loading}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium disabled:opacity-50"
          >
            {loading ? "登録中..." : "新規登録"}
          </button>

          <button
            type="button"
            onClick={() => window.location.assign("/login")}
            className="w-full rounded-2xl border border-gray-300 py-3.5 font-medium"
          >
            ログインはこちら
          </button>
        </div>
      </div>
    </main>
  );
}