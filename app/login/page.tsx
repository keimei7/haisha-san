"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      // users/{uid} が無ければ最低限作る
      if (!userSnap.exists()) {
        const now = new Date().toISOString();

        await setDoc(userRef, {
          displayName: user.displayName ?? "",
          companyId: "",
          createdAt: now,
          updatedAt: now,
        });
        router.push("/setup");
        return;
      }

      const data = userSnap.data() as {
        companyId?: string;
      };

      if (data.companyId && data.companyId.trim()) {
        router.push("/reserve");
      } else {
        router.push("/setup");
      }
    } catch (e) {
      console.error("login error:", e);
      alert("ログイン失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-5">
        <h1 className="text-xl font-bold text-center">ログイン</h1>

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
          className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
          onClick={submit}
          disabled={loading}
          type="button"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </div>
    </main>
  );
}