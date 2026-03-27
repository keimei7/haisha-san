"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

export default function JoinCompanyPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/");
      return;
    }

    if (!displayName.trim() || !inviteCode.trim()) {
      alert("表示名と招待コードを入力してください");
      return;
    }

    try {
      setSaving(true);

      const q = query(
        collection(db, "companies"),
        where("inviteCode", "==", inviteCode.trim())
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("招待コードが見つかりません");
        return;
      }

      const companyId = snap.docs[0].id;

      await setDoc(doc(db, "users", currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email ?? "",
        displayName: displayName.trim(),
        companyId,
        role: "member",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      localStorage.setItem("userName", displayName.trim());
      router.replace("/mypage");
    } catch (error) {
      console.error("join company error:", error);
      alert("会社参加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md rounded-2xl border p-4 space-y-4">
        <h1 className="text-xl font-bold">招待コードで参加</h1>

        <input
          className="w-full rounded-xl border px-3 py-3"
          placeholder="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={saving}
        />

        <input
          className="w-full rounded-xl border px-3 py-3"
          placeholder="招待コード"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          disabled={saving}
        />

        <button
          className="w-full rounded-xl bg-blue-600 py-3 text-white disabled:opacity-50"
          onClick={submit}
          disabled={saving}
        >
          参加
        </button>
      </div>
    </main>
  );
}