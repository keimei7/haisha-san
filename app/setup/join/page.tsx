"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

export default function JoinPage() {
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      window.location.replace("/");
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
      window.location.assign("/mypage");
    } catch (error: any) {
      console.error("JOIN ERROR", error);
      alert(`${error.code} / ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4">
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="表示名"
      />
      <input
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        placeholder="招待コード"
      />
      <button onClick={submit} disabled={saving}>
        参加
      </button>
    </main>
  );
}