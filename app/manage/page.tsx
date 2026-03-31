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

type Asset = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  companyId?: string;
  assignedUid?: string;
  assignedUser?: string;
};

type UserItem = {
  uid: string;
  displayName?: string;
  name?: string;
};

type UserDoc = {
  companyId?: string;
  displayName?: string;
  name?: string;
};

export default function ManagePage() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  const [name, setName] = useState("");
  const [inspection, setInspection] = useState("");
  const [assignedUid, setAssignedUid] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInspection, setEditInspection] = useState("");
  const [editAssignedUid, setEditAssignedUid] = useState("");

  const [loading, setLoading] = useState(true);

  // =========================
  // 認証
  // =========================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        router.replace("/setup");
        return;
      }

      const data = snap.data() as UserDoc;

      if (!data.companyId) {
        router.replace("/setup");
        return;
      }

      setCompanyId(data.companyId);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // =========================
  // ユーザ取得
  // =========================
  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, "users"), where("companyId", "==", companyId));

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as UserDoc;
        return {
          uid: d.id,
          displayName: data.displayName ?? "",
          name: data.name ?? "",
        };
      });

      setUsers(list);
    });
  }, [companyId]);

  // =========================
  // アセット取得
  // =========================
  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "assets"),
      where("companyId", "==", companyId),
      orderBy("sort", "asc")
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          inspection: data.inspection ?? "",
          sort: data.sort ?? 0,
          assignedUid: data.assignedUid ?? "",
          assignedUser: data.assignedUser ?? "",
        };
      });

      setAssets(list);
    });
  }, [companyId]);

  // =========================
  // ユーザ表示名
  // =========================
  const userOptions = useMemo(() => {
    return users.map((u) => ({
      uid: u.uid,
      label: u.displayName || u.name || "",
    }));
  }, [users]);

  const getUserName = (uid: string) => {
    return userOptions.find((u) => u.uid === uid)?.label ?? "";
  };

  // =========================
  // 追加
  // =========================
  const addAsset = async () => {
    if (!name.trim()) return alert("名前いれて");

    const maxSort = assets.length
      ? Math.max(...assets.map((a) => a.sort))
      : 0;

    await addDoc(collection(db, "assets"), {
      name,
      inspection,
      sort: maxSort + 1,
      companyId,
      assignedUid,
      assignedUser: assignedUid ? getUserName(assignedUid) : "",
      updatedAt: new Date().toISOString(),
    });

    setName("");
    setInspection("");
    setAssignedUid("");
  };

  // =========================
  // 編集
  // =========================
  const startEdit = (a: Asset) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditInspection(a.inspection);
    setEditAssignedUid(a.assignedUid ?? "");
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, "assets", id), {
      name: editName,
      inspection: editInspection,
      assignedUid: editAssignedUid,
      assignedUser: editAssignedUid ? getUserName(editAssignedUid) : "",
      updatedAt: new Date().toISOString(),
    });

    setEditingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("削除する？")) return;
    await deleteDoc(doc(db, "assets", id));
  };

  if (loading) return <div>loading...</div>;

  return (
    <main className="p-4 max-w-md mx-auto space-y-4">

      {/* 追加フォーム */}
      <div className="border rounded-xl p-4 space-y-3">
        <div className="font-bold">アセット追加</div>

        <input
          className="w-full border p-2 rounded"
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="点検"
          value={inspection}
          onChange={(e) => setInspection(e.target.value)}
        />

        <select
          className="w-full border p-2 rounded"
          value={assignedUid}
          onChange={(e) => setAssignedUid(e.target.value)}
        >
          <option value="">共有アセット</option>
          {userOptions.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.label}
            </option>
          ))}
        </select>

        <button
          className="w-full bg-blue-600 text-white py-2 rounded"
          onClick={addAsset}
        >
          追加
        </button>
      </div>

      {/* 一覧 */}
      <div className="space-y-3">
        {assets.map((a) => (
          <div key={a.id} className="border p-3 rounded-xl">

            {editingId === a.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border p-2 mb-2"
                />

                <input
                  value={editInspection}
                  onChange={(e) => setEditInspection(e.target.value)}
                  className="w-full border p-2 mb-2"
                />

                <select
                  value={editAssignedUid}
                  onChange={(e) => setEditAssignedUid(e.target.value)}
                  className="w-full border p-2 mb-2"
                >
                  <option value="">共有アセット</option>
                  {userOptions.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.label}
                    </option>
                  ))}
                </select>

                <button onClick={() => saveEdit(a.id)}>保存</button>
              </>
            ) : (
              <>
                <div className="font-bold">{a.name}</div>
                <div className="text-sm">{a.inspection}</div>
                <div className="text-sm text-gray-500">
                  {a.assignedUser || "共有"}
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={() => startEdit(a)}>編集</button>
                  <button onClick={() => remove(a.id)}>削除</button>
                </div>
              </>
            )}

          </div>
        ))}
      </div>

      <button
        className="w-full border py-2 rounded"
        onClick={() => router.push("/reserve")}
      >
        ← 戻る
      </button>
    </main>
  );
}