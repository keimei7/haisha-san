"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type UserDoc = {
  uid?: string;
  email?: string;
  displayName?: string;
  companyId?: string;
  role?: string;
};

export default function SetupPage() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.replace("/");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserDoc;

          if (userData.companyId) {
            window.location.replace("/mypage");
            return;
          }
        }

        // company未所属なら setup に残す
      } catch (error) {
        console.error("setup user read error:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
        <div className="space-y-1">
          <div className="text-2xl font-bold">初期設定</div>
          <div className="text-sm text-gray-500">
            参加方法を選んでください
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.assign("/setup/join")}
          className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium"
        >
          招待コードで参加
        </button>

        <button
          type="button"
          onClick={() => window.location.assign("/setup/create")}
          className="w-full rounded-2xl border border-gray-300 py-3.5 font-medium"
        >
          会社を作成
        </button>
      </div>
    </main>
  );
}