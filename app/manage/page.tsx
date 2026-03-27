"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
} from "firebase/firestore";

type Vehicle = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  assignedTo?: string;
};

type UserItem = {
  uid: string;
  displayName?: string;
  name?: string;
  companyId?: string;
  role?: string;
};

export default function ManagePage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [name, setName] = useState("");
  const [inspection, setInspection] = useState("");
  const [sort, setSort] = useState("0");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInspection, setEditInspection] = useState("");
  const [editSort, setEditSort] = useState("0");
  const [editAssignedTo, setEditAssignedTo] = useState("");

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
        setLoadingVehicles(false);
      },
      (error) => {
        console.error(error);
        alert("車両データの読み込みに失敗しました");
        setLoadingVehicles(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list: UserItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            uid?: string;
            displayName?: string;
            name?: string;
            companyId?: string;
            role?: string;
          };

          return {
            uid: data.uid ?? docSnap.id,
            displayName: data.displayName ?? "",
            name: data.name ?? "",
            companyId: data.companyId ?? "",
            role: data.role ?? "",
          };
        });

        setUsers(list);
        setLoadingUsers(false);
      },
      (error) => {
        console.error(error);
        alert("ユーザデータの読み込みに失敗しました");
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const userOptions = useMemo(() => {
    return users
      .map((u) => ({
        uid: u.uid,
        label: u.displayName?.trim() || u.name?.trim() || "",
      }))
      .filter((u) => u.label);
  }, [users]);

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

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditName(vehicle.name);
    setEditInspection(vehicle.inspection);
    setEditSort(String(vehicle.sort ?? 0));
    setEditAssignedTo(vehicle.assignedTo ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditInspection("");
    setEditSort("0");
    setEditAssignedTo("");
  };

  const saveEdit = async (vehicleId: string) => {
    if (!editName.trim()) {
      alert("車種名を入力してください");
      return;
    }

    try {
      await updateDoc(doc(db, "vehicles", vehicleId), {
        name: editName.trim(),
        inspection: editInspection.trim(),
        sort: Number(editSort) || 0,
        assignedTo: editAssignedTo.trim(),
        updatedAt: new Date().toISOString(),
      });

      cancelEdit();
    } catch (error) {
      console.error(error);
      alert("車両更新に失敗しました");
    }
  };

  const removeVehicle = async (vehicleId: string, vehicleName: string) => {
    const ok = window.confirm(`「${vehicleName}」を削除しますか？`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "vehicles", vehicleId));
    } catch (error) {
      console.error(error);
      alert("車両削除に失敗しました");
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
          <div className="font-bold text-lg">登録済み車両</div>

          {(loadingVehicles || loadingUsers) && (
            <div className="text-sm text-gray-500">読み込み中...</div>
          )}

          {!loadingVehicles && vehicles.length === 0 && (
            <div className="text-sm text-gray-500">まだ車両がありません</div>
          )}

          <div className="space-y-3">
            {vehicles.map((vehicle) => {
              const isEditing = editingId === vehicle.id;

              return (
                <div key={vehicle.id} className="rounded-xl border p-3 space-y-3">
                  {!isEditing ? (
                    <>
                      <div className="font-bold text-lg whitespace-pre-line">
                        {vehicle.name}
                      </div>

                      <div className="text-sm text-gray-600">
                        車検: {vehicle.inspection || "未設定"}
                      </div>

                      <div className="text-sm text-gray-500">
                        並び順: {vehicle.sort}
                      </div>

                      <div className="text-sm text-gray-500">
                        担当者: {vehicle.assignedTo || "共有車"}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="rounded-lg border py-2 text-sm bg-white"
                          onClick={() => startEdit(vehicle)}
                        >
                          編集
                        </button>

                        <button
                          className="rounded-lg border py-2 text-sm text-red-600 bg-white"
                          onClick={() => removeVehicle(vehicle.id, vehicle.name)}
                        >
                          削除
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">車種名</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">車検</label>
                        <input
                          value={editInspection}
                          onChange={(e) => setEditInspection(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">並び順</label>
                        <input
                          value={editSort}
                          onChange={(e) => setEditSort(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                          inputMode="numeric"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">担当者</label>
                        <select
                          value={editAssignedTo}
                          onChange={(e) => setEditAssignedTo(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                        >
                          <option value="">共有車（未割り振り）</option>
                          {userOptions.map((user) => (
                            <option key={user.uid} value={user.label}>
                              {user.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="rounded-lg bg-blue-600 text-white py-2 text-sm"
                          onClick={() => saveEdit(vehicle.id)}
                        >
                          保存
                        </button>

                        <button
                          className="rounded-lg border py-2 text-sm bg-white"
                          onClick={cancelEdit}
                        >
                          キャンセル
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}