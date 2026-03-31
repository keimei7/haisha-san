"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createUserIfNeeded = async (user: any) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const now = new Date().toISOString();

      await setDoc(ref, {
        displayName: "",
        companyId: "",
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  const handleAuth = async () => {
    try {
      setLoading(true);

      let user;

      if (mode === "login") {
        const res = await signInWithEmailAndPassword(auth, email, password);
        user = res.user;
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        user = res.user;
      }

      await createUserIfNeeded(user);

      window.location.assign("/");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm space-y-4 border p-5 rounded-2xl">
        <h1 className="text-xl font-bold text-center">配車さん</h1>

        <div className="flex gap-2">
          <button onClick={() => setMode("login")}>ログイン</button>
          <button onClick={() => setMode("signup")}>登録</button>
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メール" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="パスワード" />

        <button onClick={handleAuth} disabled={loading}>
          {loading ? "処理中..." : "進む"}
        </button>
      </div>
    </main>
  );
}