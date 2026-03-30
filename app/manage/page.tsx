"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Vehicle = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  companyId?: string;
  assignedUid?: string;
  assignedTo?: string;
};

type UserItem = {
  uid: string;
  displayName?: string;
  name?: string;
  companyId?: string;
  role?: string;
};

type UserDoc = {
  uid?: string;
  email?: string;
  displayName?: string;
  companyId?: string;
  role?: string;
  name?: string;
};

export default function ManagePage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [userRole, setUserRole] = useState("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [name, setName] = useState("");
  const [inspection, setInspection] = useState("");
  const [assignedUid, setAssignedUid] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInspection, setEditInspection] = useState("");
  const [editAssignedUid, setEditAssignedUid] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (!userSnap.exists()) {
          router.replace("/setup");
          return;
        }

        const userData = userSnap.data() as UserDoc;
        const resolvedCompanyId = userData.companyId ?? "";
        const resolvedRole = userData.role ?? "";

        setUid(currentUser.uid);
        setCompanyId(resolvedCompanyId);
        setUserRole(resolvedRole);

        if (!resolvedCompanyId) {
          alert("会社情報が見つかりません");
          router.replace("/setup");
          return;
        }

        setLoadingUser(false);
      } catch (error) {
        console.error("manage user read error:", error);
        alert("ユーザ情報の読み込みに失敗しました");
        router.replace("/reserve");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "vehicles"),
      where("companyId", "==", companyId),
      orderBy("sort", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Vehicle[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            name?: string;
            inspection?: string;
            sort?: number;
            companyId?: string;
            assignedUid?: string;
            assignedTo?: string;
          };

          return {
            id: docSnap.id,
            name: data.name ?? "",
            inspection: data.inspection ?? "",
            sort: data.sort ?? 0,
            companyId: data.companyId ?? "",
            assignedUid: data.assignedUid ?? "",
            assignedTo: data.assignedTo ?? "",
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
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "users"),
      where("companyId", "==", companyId)
    );

    const unsubscribe = onSnapshot(
      q,
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
        console.error("users read error:", error);
        alert("ユーザ一覧の読み込みに失敗しました");
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const userOptions = useMemo(() => {
    return users
      .map((u) => ({
        uid: u.uid,
        label: u.displayName?.trim() || u.name?.trim() || "",
      }))
      .filter((u) => u.label)
      .sort((a, b) => a.label.localeCompare(b.label, "ja"));
  }, [users]);

  const resolveUserLabel = (targetUid: string) => {
    return userOptions.find((u) => u.uid === targetUid)?.label ?? "";
  };

  const addVehicle = async () => {
    if (!name.trim()) {
      alert("車種名を入力してください");
      return;
    }
    if (!companyId) {
      alert("会社情報が取得できません");
      return;
    }

    try {
      setSaving(true);

      const maxSort = vehicles.length
        ? Math.max(...vehicles.map((v) => Number(v.sort) || 0))
        : 0;

      const assignedLabel = assignedUid ? resolveUserLabel(assignedUid) : "";

      await addDoc(collection(db, "vehicles"), {
        name: name.trim(),
        inspection: inspection.trim(),
        sort: maxSort + 1,
        companyId,
        assignedUid: assignedUid || "",
        assignedTo: assignedLabel,
        updatedAt: new Date().toISOString(),
      });

      setName("");
      setInspection("");
      setAssignedUid("");
    } catch (error) {
      console.error("add vehicle error:", error);
      alert("車両追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditName(vehicle.name);
    setEditInspection(vehicle.inspection);
    setEditAssignedUid(vehicle.assignedUid ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditInspection("");
    setEditAssignedUid("");
  };

  const saveEdit = async (vehicleId: string) => {
    if (!editName.trim()) {
      alert("車種名を入力してください");
      return;
    }

    try {
      const assignedLabel = editAssignedUid ? resolveUserLabel(editAssignedUid) : "";

      await updateDoc(doc(db, "vehicles", vehicleId), {
        name: editName.trim(),
        inspection: editInspection.trim(),
        assignedUid: editAssignedUid || "",
        assignedTo: assignedLabel,
        updatedAt: new Date().toISOString(),
      });

      cancelEdit();
    } catch (error) {
      console.error("save edit error:", error);
      alert("車両更新に失敗しました");
    }
  };

  const removeVehicle = async (vehicleId: string, vehicleName: string) => {
    const ok = window.confirm(`「${vehicleName}」を削除しますか？`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "vehicles", vehicleId));
    } catch (error) {
      console.error("delete vehicle error:", error);
      alert("車両削除に失敗しました");
    }
  };

  const moveVehicle = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= vehicles.length) return;

    const current = vehicles[index];
    const target = vehicles[targetIndex];

    try {
      await Promise.all([
        updateDoc(doc(db, "vehicles", current.id), {
          sort: target.sort,
          updatedAt: new Date().toISOString(),
        }),
        updateDoc(doc(db, "vehicles", target.id), {
          sort: current.sort,
          updatedAt: new Date().toISOString(),
        }),
      ]);
    } catch (error) {
      console.error("move vehicle error:", error);
      alert("並び替えに失敗しました");
    }
  };

  const isLoading = loadingUser || loadingVehicles || loadingUsers;

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-white py-3 px-4 flex items-center justify-between border-b">
            <div className="font-bold text-lg">⚙️ 管理ページ</div>
            <button
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={() => router.push("/reserve")}
              type="button"
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
              <label className="text-sm text-gray-600">担当者</label>
              <select
                value={assignedUid}
                onChange={(e) => setAssignedUid(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                <option value="">共有車（未割り振り）</option>
                {userOptions.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
              onClick={addVehicle}
              disabled={saving}
              type="button"
            >
              {saving ? "追加中..." : "車両を追加"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-bold text-lg">登録済み車両</div>

          {isLoading && (
            <div className="text-sm text-gray-500">読み込み中...</div>
          )}

          {!loadingVehicles && vehicles.length === 0 && (
            <div className="text-sm text-gray-500">まだ車両がありません</div>
          )}

          <div className="space-y-3">
            {vehicles.map((vehicle, index) => {
              const isEditing = editingId === vehicle.id;

              return (
                <div key={vehicle.id} className="rounded-xl border p-3 space-y-3">
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-lg whitespace-pre-line">
                          {vehicle.name}
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border px-3 py-1 text-sm bg-white disabled:opacity-40"
                            onClick={() => moveVehicle(index, -1)}
                            disabled={index === 0}
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            className="rounded-lg border px-3 py-1 text-sm bg-white disabled:opacity-40"
                            onClick={() => moveVehicle(index, 1)}
                            disabled={index === vehicles.length - 1}
                            type="button"
                          >
                            ↓
                          </button>
                        </div>
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
                          type="button"
                        >
                          編集
                        </button>

                        <button
                          className="rounded-lg border py-2 text-sm text-red-600 bg-white"
                          onClick={() => removeVehicle(vehicle.id, vehicle.name)}
                          type="button"
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
                        <label className="text-sm text-gray-600">担当者</label>
                        <select
                          value={editAssignedUid}
                          onChange={(e) => setEditAssignedUid(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 mt-1"
                        >
                          <option value="">共有車（未割り振り）</option>
                          {userOptions.map((user) => (
                            <option key={user.uid} value={user.uid}>
                              {user.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="rounded-lg bg-blue-600 text-white py-2 text-sm"
                          onClick={() => saveEdit(vehicle.id)}
                          type="button"
                        >
                          保存
                        </button>

                        <button
                          className="rounded-lg border py-2 text-sm bg-white"
                          onClick={cancelEdit}
                          type="button"
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