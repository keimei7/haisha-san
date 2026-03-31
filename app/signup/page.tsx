"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      alert("表示名・メール・パスワードを入力してください");
      return;
    }

    try {
      setLoading(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = credential.user;
      const now = new Date().toISOString();

      await updateProfile(user, {
        displayName: displayName.trim(),
      });

      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        companyId: "",
        createdAt: now,
        updatedAt: now,
      });

      router.push("/setup");
    } catch (e) {
      console.error("signup error:", e);
      alert("登録失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-5">
        <h1 className="text-xl font-bold text-center">新規登録</h1>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="メール"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
          onClick={submit}
          disabled={loading}
          type="button"
        >
          {loading ? "登録中..." : "登録"}
        </button>
      </div>
    </main>
  );
}