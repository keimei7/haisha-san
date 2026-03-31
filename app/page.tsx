"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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

        const data = snap.data() as { companyId?: string };

        if (data.companyId && data.companyId.trim() !== "") {
          window.location.replace("/reserve");
        } else {
          window.location.replace("/setup");
        }
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