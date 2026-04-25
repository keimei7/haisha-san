"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type PhotoSlot = {
  id: string;
  title: string;
  timing: string;
};

export default function PhotoSlotsPage() {
  const [companyId, setCompanyId] = useState("");
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [title, setTitle] = useState("");
  const [timing, setTiming] = useState("morning");

  // company取得
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const snap = await fetch(`/api/getCompanyId?uid=${user.uid}`);
      const data = await snap.json();
      setCompanyId(data.companyId);
    });

    return () => unsub();
  }, []);

  // リアルタイム取得
  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, "photoSlots"), where("companyId", "==", companyId));

    const unsub = onSnapshot(q, (snap) => {
      setSlots(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    return () => unsub();
  }, [companyId]);

  return (
    <main className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">チェック項目管理</h1>

      {/* 追加 */}
      <div className="border rounded-xl p-3 space-y-2">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="項目名（例：酒気帯び）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="w-full border rounded px-3 py-2"
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
        >
          <option value="morning">朝</option>
          <option value="evening">夕</option>
          <option value="any">任意</option>
        </select>

        <button
          className="w-full bg-blue-600 text-white rounded py-2"
          onClick={async () => {
            if (!title.trim()) return alert("タイトル入れて");

            await addDoc(collection(db, "photoSlots"), {
              companyId,
              title: title.trim(),
              timing,
              createdAt: new Date().toISOString(),
            });

            setTitle("");
          }}
        >
          ＋追加
        </button>
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.id} className="border rounded-xl p-3 flex justify-between">
            <div>
              <div className="font-medium">{slot.title}</div>
              <div className="text-xs text-gray-500">{slot.timing}</div>
            </div>

            <button
              className="text-red-500 text-sm"
              onClick={() => deleteDoc(doc(db, "photoSlots", slot.id))}
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
