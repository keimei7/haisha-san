"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert("入力しろ");

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/setup/create-company";
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) return alert("入力しろ");

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "/setup/create-company";
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        alert("登録済み → ログインして");
      } else {
        alert(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <input
        className="border p-2 w-full"
        placeholder="メール"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full"
        placeholder="パスワード"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="w-full bg-blue-600 text-white py-2"
        onClick={handleLogin}
        disabled={loading}
      >
        ログイン
      </button>

      <button
        className="w-full border py-2"
        onClick={handleSignup}
        disabled={loading}
      >
        新規登録
      </button>
    </main>
  );
}