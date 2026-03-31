"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function CreateCompanyPage() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const user = auth.currentUser;

    if (!user) {
      window.location.replace("/login");
      return;
    }

    if (!name.trim()) {
      alert("会社名を入力してください");
      return;
    }

    try {
      setSaving(true);

      const inviteCode = Math.random().toString(36).slice(2, 8);

      const companyRef = await addDoc(collection(db, "companies"), {
        name: name.trim(),
        inviteCode,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", user.uid), {
        companyId: companyRef.id,
      });

      alert(`招待コード: ${inviteCode}`);

      window.location.assign("/reserve");
    } catch (e) {
      console.error("company create error:", e);
      alert("会社作成失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">会社を作成</h1>

        <input
          className="w-full border rounded-xl px-3 py-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="会社名"
        />

        <button
          className="w-full bg-blue-600 text-white py-3 rounded-xl disabled:opacity-50"
          onClick={submit}
          disabled={saving}
          type="button"
        >
          {saving ? "作成中..." : "作成"}
        </button>
      </div>
    </main>
  );
}