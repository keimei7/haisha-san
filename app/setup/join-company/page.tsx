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
  getDoc,
} from "firebase/firestore";

export default function JoinCompanyPage() {
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const user = auth.currentUser;

    if (!user) {
      window.location.replace("/login");
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
        where("inviteCode", "==", inviteCode.trim().toUpperCase())
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("招待コードが見つかりません");
        return;
      }

      const companyId = snap.docs[0].id;
      const now = new Date().toISOString();

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const current = userSnap.data() as {
          createdAt?: string;
        };

        await setDoc(
          userRef,
          {
            displayName: displayName.trim(),
            companyId,
            role: "pending",
            createdAt: current.createdAt ?? now,
            updatedAt: now,
          },
          { merge: true }
        );
      } else {
        await setDoc(userRef, {
          displayName: displayName.trim(),
          companyId,
          role: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }

      window.location.assign("/waiting");
    } catch (error: any) {
      console.error("JOIN ERROR", error);
      alert(`${error.code} / ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-5 space-y-4">
        <h1 className="text-xl font-bold">招待コードで参加</h1>

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="招待コード"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />

        <button
          className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
          onClick={submit}
          disabled={saving}
          type="button"
        >
          {saving ? "参加中..." : "参加"}
        </button>
      </div>
    </main>
  );
}