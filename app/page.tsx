"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function HomePage() {
  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;

      if (!user) {
        window.location.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        window.location.replace("/setup");
        return;
      }

      const data = snap.data() as { companyId?: string };

      if (data.companyId && data.companyId.trim()) {
        window.location.replace("/reserve");
      } else {
        window.location.replace("/setup");
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">読み込み中...</div>
    </main>
  );
}