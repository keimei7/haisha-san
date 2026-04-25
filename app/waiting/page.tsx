"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type UserRole = "owner" | "admin" | "member" | "pending";

export default function WaitingPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          window.location.replace("/setup");
          return;
        }

        const data = snap.data() as {
          role?: UserRole;
          displayName?: string;
        };

        setName(data.displayName ?? "");

        // 🟢 承認されたら自動で入れる
        if (
          data.role === "owner" ||
          data.role === "admin" ||
          data.role === "member"
        ) {
          window.location.replace("/reserve");
          return;
        }
      } catch (e) {
        console.error(e);
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.replace("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black p-6">
      <div className="max-w-md w-full border rounded-2xl p-6 text-center space-y-4 shadow-sm">
        
        <div className="text-xl font-bold">
          承認待ちです
        </div>

        <div className="text-sm text-gray-500">
          {name ? `${name} さん` : ""}
          管理者が権限を付与するまでお待ちください
        </div>

        <div className="text-xs text-gray-400">
          承認後、自動で画面が切り替わります
        </div>

        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full border rounded-lg py-2 text-sm hover:bg-gray-50"
          >
            ログアウト
          </button>
        </div>

      </div>
    </main>
  );
}