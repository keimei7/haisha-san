"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Setup() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.replace("/");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        router.replace("/setup/join-company");
        return;
      }

      router.replace("/mypage");
    };

    run();
  }, []);

  return <div>読み込み中...</div>;
}