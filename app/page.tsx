"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type UserData = {
  companyId?: string;
  role?: "owner" | "admin" | "member" | "pending";
};

export default function HomePage() {
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

        const data = snap.data() as UserData;

        // 会社未所属
        if (!data.companyId || data.companyId.trim() === "") {
          window.location.replace("/setup");
          return;
        }

        const role = data.role ?? "pending";

        // 🔴 未承認ユーザー
        if (role === "pending") {
          window.location.replace("/waiting");
          return;
        }

        // 🟢 利用可能ユーザー
        if (
          role === "owner" ||
          role === "admin" ||
          role === "member"
        ) {
          window.location.replace("/reserve");
          return;
        }

        // 想定外
        window.location.replace("/login");
      } catch (error) {
        console.error("root routing error:", error);
        window.location.replace("/login");
      }
    });

    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="text-gray-500">読み込み中...</div>
    </main>
  );
}