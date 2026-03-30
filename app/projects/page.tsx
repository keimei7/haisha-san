"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Vehicle = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  assignedTo?: string;
  updatedAt?: string;
};

type UserItem = {
  id: string;
  name: string;
  email?: string;
  uid?: string;
  updatedAt?: string;
};

function toNumber(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export default function ManagePage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [formName, setFormName] = useState("");
  const [formInspection, setFormInspection] = useState("");
  const [formSort, setFormSort] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");

  const [saving, setSaving] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
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
            updatedAt?: string;
          };

          return {
            id: docSnap.id,
            name: data.name ?? "",
            inspection: data.inspection ?? "",
            sort: data.sort ?? 0,
            assignedTo: data.assignedTo ?? "",
            updatedAt: data.updatedAt ?? "",
          };
        });

        setVehicles(list);
        setLoadingVehicles(false);
      },
      (error) => {
        console.error("vehicles read error:", error);
        alert("車両データの読み込みに失敗しました");
        setLoadingVehicles(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            name?: string;
            email?: string;
            uid?: string;
            updatedAt?: string;
          };

          return {
            id: docSnap.id,
            name: data.name ?? "",
            email: data.email ?? "",
            uid: data.uid ?? "",
            updatedAt: data.updatedAt ?? "",
          };
        });

        setUsers(list);
        setLoadingUsers(false);
      },
      (error) => {
        console.error("users read error:", error);
        alert("ユーザデータの読み込みに失敗しました");
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const registeredUserNames = useMemo(() => {
    return users
      .map((u) => u.name.trim())
      .filter((name, index, arr) => !!name && arr.indexOf(name) === index)
      .sort((a, b) => a.localeCompare(b, "ja"));
  }, [users]);

  const sharedVehicles = useMemo(() => {
    return vehicles.filter((v) => !(v.assignedTo ?? "").trim());
  }, [vehicles]);

  const myCarVehicles = useMemo(() => {
    return vehicles.filter((v) => (v.assignedTo ?? "").trim());
  }, [vehicles]);

  const resetForm = () => {
    setFormName("");
    setFormInspection("");
    setFormSort("");
    setFormAssignedTo("");
    setEditingVehicle(null);
    setSaving(false);
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormName(vehicle.name);
    setFormInspection(vehicle.inspection ?? "");
    setFormSort(String(vehicle.sort ?? 0));
    setFormAssignedTo(vehicle.assignedTo ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveVehicle = async () => {
    const trimmedName = formName.trim();
    const trimmedInspection = formInspection.trim();
    const trimmedAssignedTo = formAssignedTo.trim();
    const sortValue = toNumber(formSort);

    if (!trimmedName) {
      alert("車種名を入力してください");
      return;
    }

    try {
      setSaving(true);

      if (editingVehicle) {
        await updateDoc(doc(db, "vehicles", editingVehicle.id), {
          name: trimmedName,
          inspection: trimmedInspection,
          sort: sortValue,
          assignedTo: trimmedAssignedTo,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "vehicles"), {
          name: trimmedName,
          inspection: trimmedInspection,
          sort: sortValue,
          assignedTo: trimmedAssignedTo,
          updatedAt: new Date().toISOString(),
        });
      }

      resetForm();
    } catch (error) {
      console.error("vehicle save error:", error);
      alert("車両の保存に失敗しました");
      setSaving(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    const ok = window.confirm("削除しますか？");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "vehicles", id));

      if (editingVehicle?.id === id) {
        resetForm();
      }
    } catch (error) {
      console.error("vehicle delete error:", error);
      alert("削除に失敗しました");
    }
  };

  const isLoading = loadingVehicles || loadingUsers;

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-white py-3 px-4 flex items-center justify-between border-b">
            <div className="font-bold text-lg">⚙️ 管理ページ</div>

            <button
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={() => router.push("/reserve")}
            >
              ← マイページ
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="text-sm text-gray-600">車種名</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例：2tダンプ"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">車検日</label>
              <input
                value={formInspection}
                onChange={(e) => setFormInspection(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例：2026/08"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">並び順</label>
              <input
                value={formSort}
                onChange={(e) => setFormSort(e.target.value.replace(/[^\d]/g, ""))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="数字"
                inputMode="numeric"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">担当者</label>
              <select
                value={formAssignedTo}
                onChange={(e) => setFormAssignedTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                disabled={saving}
              >
                <option value="">未設定（共有車）</option>
                {registeredUserNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <div className="mt-1 text-xs text-gray-500">
                担当者が未設定の車は自動で共有車になります。
              </div>
            </div>

            {editingVehicle ? (
              <div className="flex gap-2">
                <button
                  onClick={saveVehicle}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50"
                >
                  保存
                </button>

                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={saveVehicle}
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50"
              >
                ＋車両登録
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-bold text-lg">登録ユーザ</div>
            {!loadingUsers && (
              <div className="text-sm text-gray-500">{registeredUserNames.length}人</div>
            )}
          </div>

          {loadingUsers ? (
            <div className="text-sm text-gray-500">読み込み中...</div>
          ) : registeredUserNames.length === 0 ? (
            <div className="text-sm text-gray-500">まだ登録ユーザがありません</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {registeredUserNames.map((name) => (
                <div
                  key={name}
                  className="rounded-full border px-3 py-1 text-sm bg-gray-50"
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">共有車</h2>
            {!loadingVehicles && (
              <div className="text-sm text-gray-500">{sharedVehicles.length}台</div>
            )}
          </div>

          {isLoading ? (
            <div className="text-sm text-gray-500">読み込み中...</div>
          ) : sharedVehicles.length === 0 ? (
            <div className="text-sm text-gray-500">共有車はありません</div>
          ) : (
            <div className="space-y-3">
              {sharedVehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-xl border p-3 space-y-2">
                  <div className="font-bold text-lg whitespace-pre-line">
                    {vehicle.name}
                  </div>

                  <div className="text-sm text-gray-600">
                    車検: {vehicle.inspection || "未設定"}
                  </div>

                  <div className="text-sm text-gray-500">並び順: {vehicle.sort}</div>

                  <div className="text-sm text-gray-500">区分: 共有車</div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => startEdit(vehicle)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      編集
                    </button>

                    <button
                      onClick={() => deleteVehicle(vehicle.id)}
                      className="rounded-lg border border-red-400 text-red-500 px-3 py-2 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">マイカー</h2>
            {!loadingVehicles && (
              <div className="text-sm text-gray-500">{myCarVehicles.length}台</div>
            )}
          </div>

          {isLoading ? (
            <div className="text-sm text-gray-500">読み込み中...</div>
          ) : myCarVehicles.length === 0 ? (
            <div className="text-sm text-gray-500">マイカーはありません</div>
          ) : (
            <div className="space-y-3">
              {myCarVehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-xl border p-3 space-y-2">
                  <div className="font-bold text-lg whitespace-pre-line">
                    {vehicle.name}
                  </div>

                  <div className="text-sm text-gray-600">
                    車検: {vehicle.inspection || "未設定"}
                  </div>

                  <div className="text-sm text-gray-500">並び順: {vehicle.sort}</div>

                  <div className="text-sm text-gray-500">
                    担当者: {vehicle.assignedTo}
                  </div>

                  <div className="text-sm text-gray-500">区分: マイカー</div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => startEdit(vehicle)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      編集
                    </button>

                    <button
                      onClick={() => deleteVehicle(vehicle.id)}
                      className="rounded-lg border border-red-400 text-red-500 px-3 py-2 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}