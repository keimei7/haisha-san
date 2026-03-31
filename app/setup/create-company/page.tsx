"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
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

      const now = new Date().toISOString();
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const companyRef = await addDoc(collection(db, "companies"), {
        name: name.trim(),
        inviteCode,
        ownerId: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const current = userSnap.data() as {
          displayName?: string;
          createdAt?: string;
        };

        await setDoc(
          userRef,
          {
            displayName: current.displayName ?? user.displayName ?? "オーナー",
            companyId: companyRef.id,
            createdAt: current.createdAt ?? now,
            updatedAt: now,
          },
          { merge: true }
        );
      } else {
        await setDoc(userRef, {
          displayName: user.displayName ?? "オーナー",
          companyId: companyRef.id,
          createdAt: now,
          updatedAt: now,
        });
      }

      alert(`会社を作成しました\n招待コード: ${inviteCode}`);
      window.location.assign("/reserve");
    } catch (e) {
      console.error("company create error:", e);
      alert(`会社作成失敗: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-5 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">会社を作成</h1>
          <p className="text-sm text-gray-500">
            会社名を登録すると、招待コード付きで会社を作成できます。
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">会社名</label>
          <input
            className="w-full border rounded-xl px-3 py-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="会社名"
          />
        </div>

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