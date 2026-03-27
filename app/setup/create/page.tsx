"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  companyId: string;
  role: "admin" | "member";
  createdAt?: string;
  updatedAt?: string;
};

type CompanyDoc = {
  name: string;
  inviteCode: string;
  ownerUid: string;
  createdAt?: string;
  updatedAt?: string;
};

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function CreateCompanyPage() {
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const [createdCompanyId, setCreatedCompanyId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [companyDocName, setCompanyDocName] = useState("");

  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;
      if (!user) {
        window.location.replace("/");
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserDoc;
        setDisplayName(userData.displayName ?? "");
        if (userData.companyId) {
          const companySnap = await getDoc(doc(db, "companies", userData.companyId));
          if (companySnap.exists()) {
            const companyData = companySnap.data() as CompanyDoc;
            setCreatedCompanyId(userData.companyId);
            setInviteCode(companyData.inviteCode ?? "");
            setCompanyDocName(companyData.name ?? "");
            setCompanyName(companyData.name ?? "");
          }
        }
      }

      setReady(true);
    };

    run();
  }, []);

  const handleCreate = async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.replace("/");
      return;
    }

    if (!displayName.trim() || !companyName.trim()) {
      alert("表示名と会社名を入力してください");
      return;
    }

    try {
      setSaving(true);

      const nextInviteCode = makeInviteCode();

      const companyRef = await addDoc(collection(db, "companies"), {
        name: companyName.trim(),
        inviteCode: nextInviteCode,
        ownerUid: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email ?? "",
        displayName: displayName.trim(),
        companyId: companyRef.id,
        role: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setCreatedCompanyId(companyRef.id);
      setInviteCode(nextInviteCode);
      setCompanyDocName(companyName.trim());
      alert("会社を作成しました");
    } catch (error) {
      console.error("create company error:", error);
      alert("会社作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const copyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      alert("招待コードをコピーしました");
    } catch {
      alert(`招待コード: ${inviteCode}`);
    }
  };

  if (!ready) {
    return <main className="p-4">読み込み中...</main>;
  }

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b">
          <div className="text-2xl font-bold">会社を作成</div>
          <div className="mt-1 text-sm text-gray-500">
            会社を作成すると、招待コードで他のメンバーを追加できます。
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!inviteCode ? (
            <>
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
                <label className="mb-1 block text-sm text-gray-600">会社名</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3"
                  placeholder="例：株式会社配車"
                  disabled={saving}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium disabled:opacity-50"
              >
                {saving ? "作成中..." : "作成"}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="text-sm text-blue-800">会社作成が完了しました</div>
                <div className="text-lg font-bold">{companyDocName}</div>

                <div>
                  <div className="text-xs text-gray-500">招待コード</div>
                  <div className="mt-1 rounded-xl bg-white border px-4 py-3 text-2xl font-bold tracking-widest">
                    {inviteCode}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  このコードをメンバーに共有すると参加できます。
                </div>

                <button
                  type="button"
                  onClick={copyInviteCode}
                  className="w-full rounded-2xl border border-blue-300 bg-white py-3 font-medium"
                >
                  招待コードをコピー
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.location.assign("/mypage")}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium"
              >
                マイページへ
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}