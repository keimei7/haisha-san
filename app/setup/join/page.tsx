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

export default function JoinCompanyPage() {
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleJoin = async () => {
    const user = auth.currentUser;
    if (!user) {
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
        where("inviteCode", "==", inviteCode.trim().toUpperCase())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("招待コードが見つかりません");
        return;
      }

      const companyId = snap.docs[0].id;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email ?? "",
        displayName: displayName.trim(),
        companyId,
        role: "member",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      alert("会社に参加しました");
      window.location.assign("/mypage");
    } catch (error) {
      console.error("join error:", error);
      alert("会社参加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b">
          <div className="text-2xl font-bold">招待コードで参加</div>
          <div className="mt-1 text-sm text-gray-500">
            共有された招待コードを入力して会社に参加します。
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">表示名</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              placeholder="例：設樂 啓明"
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">招待コード</label>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 tracking-widest"
              placeholder="例：UVQ5W6"
              disabled={saving}
            />
          </div>

          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            招待コードは会社作成者が発行した6文字のコードです。
          </div>

          <button
            onClick={handleJoin}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium disabled:opacity-50"
          >
            {saving ? "参加中..." : "参加"}
          </button>

          <button
            type="button"
            onClick={() => window.location.assign("/setup/create")}
            className="w-full rounded-2xl border border-gray-300 py-3.5 font-medium"
          >
            会社を作る
          </button>
        </div>
      </div>
    </main>
  );
}