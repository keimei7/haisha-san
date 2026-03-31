"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function RootPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setChecking(false);
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          window.location.replace("/setup");
          return;
        }

        const data = snap.data() as { companyId?: string };

        if (data.companyId && data.companyId.trim() !== "") {
          window.location.replace("/reserve");
        } else {
          window.location.replace("/setup");
        }
      } catch (error) {
        console.error("root routing error:", error);
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center gap-4 border-b">
          <img
            src="/icon.png"
            alt="配車さん"
            className="w-24 h-24 object-contain"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-wide">配車さん</h1>
            <p className="text-sm text-gray-500 leading-6">
              社用車・共有車の予約を
              <br />
              シンプルに管理できる社内ツール
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <button
            type="button"
            onClick={() => window.location.assign("/login")}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium"
          >
            ログイン
          </button>

          <button
            type="button"
            onClick={() => window.location.assign("/signup")}
            className="w-full rounded-2xl border border-gray-300 py-3.5 font-medium"
          >
            新規登録
          </button>

          <div className="rounded-2xl bg-gray-50 p-4 text-xs leading-6 text-gray-500">
            ログイン済みの場合は、自動で予約画面または初期設定画面へ移動します。
          </div>
        </div>
      </div>
    </main>
  );
}