"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">ログイン</h1>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="メール"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full bg-black text-white py-2 rounded-lg"
          onClick={async () => {
            try {
              await signInWithEmailAndPassword(auth, email, password);
              router.push("/reserve"); // ←ここ重要
            } catch (e) {
              alert("ログイン失敗");
            }
          }}
        >
          ログイン
        </button>
      </div>
    </main>
  );
}