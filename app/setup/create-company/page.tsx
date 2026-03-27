"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function CreateCompanyPage() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.replace("/");
      return;
    }

    if (!name.trim()) {
      alert("会社名を入力してください");
      return;
    }

    try {
      setSaving(true);

      const inviteCode = Math.random().toString(36).slice(2, 8);

      const docRef = await addDoc(collection(db, "companies"), {
        name: name.trim(),
        inviteCode,
        ownerUid: user.uid,
        createdAt: new Date().toISOString(),
      });

      alert(`招待コード: ${inviteCode}`);

      window.location.assign("/setup/join");
    } catch (e) {
      console.error(e);
      alert("会社作成失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="会社名"
      />
      <button onClick={submit} disabled={saving}>
        作成
      </button>
    </main>
  );
}