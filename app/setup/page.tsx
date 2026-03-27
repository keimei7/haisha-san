"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function SetupPage() {
  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;

      if (!user) {
        window.location.replace("/");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        window.location.replace("/mypage");
        return;
      }

      window.location.replace("/setup/join");
    };

    run();
  }, []);

  return <main className="p-4">読み込み中...</main>;
}