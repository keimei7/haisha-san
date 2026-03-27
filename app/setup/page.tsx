"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function SetupPage() {
  const router = useRouter();
  const [message, setMessage] = useState("読み込み中...");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.replace("/");
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          router.replace("/mypage");
          return;
        }

        router.replace("/setup/create-company");
      } catch (error) {
        console.error("setup error:", error);
        setMessage("初期設定の確認に失敗しました");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <main className="p-4">{message}</main>;
}