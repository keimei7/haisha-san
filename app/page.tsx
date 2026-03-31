"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function RootPage() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
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

      if (data.companyId && data.companyId.trim() !== "") {
        window.location.replace("/reserve");
      } else {
        window.location.replace("/setup");
      }
    });

    return () => unsub();
  }, []);

  return <main className="p-4">読み込み中...</main>;
}