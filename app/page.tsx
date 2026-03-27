"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AuthEntryPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          router.replace("/mypage");
        } else {
          router.replace("/setup");
        }
      } catch (error) {
        console.error("auth entry check error:", error);
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      alert("メールアドレスとパスワードを入力してください");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      console.error("login error:", error);
      alert(error.message || "ログインに失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleSignup = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/setup");
    } catch (error: any) {
      console.error("signup error:", error);

      if (error.code === "auth/email-already-in-use") {
        alert("このメールアドレスはすでに登録されています。ログインしてください。");
        return;
      }

      alert(error.message || "ユーザ登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return <main className="p-4">読み込み中...</main>;
  }

  return (
    <main className="min-h-screen bg-white text-black p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border overflow-hidden bg-white">
        <div className="py-8 px-6 flex flex-col items-center gap-4 border-b">
          <img
            src="/icon.png"
            alt="配車さん"
            className="w-20 h-20 object-contain"
          />
          <div className="text-3xl font-bold">配車さん</div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600">メールアドレス</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">パスワード</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-3 pt-2">
            <button
              className="w-full rounded-xl bg-blue-600 text-white py-3 text-lg font-medium disabled:opacity-50"
              onClick={handleLogin}
              disabled={saving}
            >
              ログイン
            </button>

            <button
              className="w-full rounded-xl border py-3 text-lg font-medium disabled:opacity-50"
              onClick={handleSignup}
              disabled={saving}
            >
              ユーザ登録
            </button>
          </div>

          <p className="text-xs text-gray-500 leading-5">
            初めて利用する方は「ユーザ登録」、すでに登録済みの方は「ログイン」から進んでください。
          </p>
        </div>
      </div>
    </main>
  );
}