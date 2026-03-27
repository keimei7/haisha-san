"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
} from "firebase/firestore";

type Vehicle = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  assignedTo?: string;
};

export default function ManagePage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [inspection, setInspection] = useState("");
  const [sort, setSort] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace("/");
      return;
    }

    const q = query(collection(db, "vehicles"), orderBy("sort", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Vehicle[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            name?: string;
            inspection?: string;
            sort?: number;
            assignedTo?: string;
          };

          return {
            id: docSnap.id,
            name: data.name ?? "",
            inspection: data.inspection ?? "",
            sort: data.sort ?? 0,
            assignedTo: data.assignedTo ?? "",
          };
        });

        setVehicles(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        alert("車両データの読み込みに失敗しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  const addVehicle = async () => {
    if (!name.trim()) {
      alert("車種名を入力してください");
      return;
    }

    try {
      setSaving(true);

      await addDoc(collection(db, "vehicles"), {
        name: name.trim(),
        inspection: inspection.trim(),
        sort: Number(sort) || 0,
        assignedTo: "",
        updatedAt: new Date().toISOString(),
      });

      setName("");
      setInspection("");
      setSort("0");
    } catch (error) {
      console.error(error);
      alert("車両追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-white py-3 px-4 flex items-center justify-between border-b">
            <div className="font-bold text-lg">⚙️ 管理ページ</div>
            <button
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={() => router.push("/mypage")}
            >
              ← マイページ
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="text-sm text-gray-600">車種名</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="例：2tダンプ"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">車検</label>
              <input
                value={inspection}
                onChange={(e) => setInspection(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="例：2026/08"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">並び順</label>
              <input
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
                inputMode="numeric"
              />
            </div>

            <button
              className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
              onClick={addVehicle}
              disabled={saving}
            >
              {saving ? "追加中..." : "車両を追加"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-bold text-lg">登録車両</div>

          {loading && <div className="text-sm text-gray-500">読み込み中...</div>}

          {!loading && vehicles.length === 0 && (
            <div className="text-sm text-gray-500">まだ車両がありません</div>
          )}

          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border p-3 space-y-1">
                <div className="font-bold">{vehicle.name}</div>
                <div className="text-sm text-gray-600">
                  車検: {vehicle.inspection || "未設定"}
                </div>
                <div className="text-sm text-gray-500">
                  並び順: {vehicle.sort}
                </div>
                <div className="text-sm text-gray-500">
                  担当者: {vehicle.assignedTo || "共有車"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}