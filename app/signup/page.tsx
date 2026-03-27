"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/setup");
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        alert("すでに登録済みです → ログインしてください");
        router.push("/login");
      } else {
        alert("登録失敗");
      }
    }
  };

  return (
    <main className="p-4">
      <input onChange={(e) => setEmail(e.target.value)} placeholder="メール" />
      <input onChange={(e) => setPassword(e.target.value)} placeholder="パスワード" />
      <button onClick={signup}>登録</button>
    </main>
  );
}