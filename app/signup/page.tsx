"use client";

import { FormEvent, useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    try {
      setMessage("登録中...");

      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      window.location.href = "/setup/create-company";
    } catch (error: any) {
      console.error("signup error:", error);
      setMessage("");

      if (error.code === "auth/email-already-in-use") {
        const goLogin = window.confirm(
          "このメールアドレスはすでに登録されています。ログイン画面へ移動しますか？"
        );
        if (goLogin) {
          window.location.href = "/login";
        }
        return;
      }

      alert(error.message || "ユーザ登録に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md rounded-2xl border p-4 space-y-4">
        <h1 className="text-xl font-bold">ユーザ登録</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-gray-600">メールアドレス</label>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">パスワード</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 text-white"
          >
            登録
          </button>
        </form>

        <button
          type="button"
          className="w-full rounded-lg border py-2"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          すでに登録済みの方はこちら
        </button>

        {message && <div className="text-sm text-gray-500">{message}</div>}
      </div>
    </main>
  );
}