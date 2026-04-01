"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";

type UserRole = "owner" | "admin" | "member";

type Member = {
  uid: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
};

export default function CompanyAdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [myUid, setMyUid] = useState("");
  const [myRole, setMyRole] = useState<UserRole | "">("");

  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [ownerUid, setOwnerUid] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setMyUid(user.uid);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (!userData?.companyId) {
          router.replace("/");
          return;
        }

        if (userData.role !== "admin") {
          router.replace("/");
          return;
        }

        const currentCompanyId = userData.companyId as string;
        const currentRole = userData.role as UserRole;

        setCompanyId(currentCompanyId);
        setMyRole(currentRole);

        const companyRef = doc(db, "companies", currentCompanyId);
        const companySnap = await getDoc(companyRef);
        const companyData = companySnap.data();

        setCompanyName(companyData?.name ?? "");
        setInviteCode(companyData?.inviteCode ?? "");
        setOwnerUid(companyData?.ownerUid ?? "");

        await fetchMembers(currentCompanyId);
      } catch (error) {
        console.error(error);
        alert("管理ページの初期化に失敗しました");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchMembers = async (targetCompanyId: string) => {
    const q = query(
      collection(db, "users"),
      where("companyId", "==", targetCompanyId)
    );

    const snap = await getDocs(q);

    const list: Member[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName ?? "",
        email: data.email ?? "",
        role: data.role ?? "member",
      };
    });

    const sorted = list.sort((a, b) => {
      const rank = { owner: 0, admin: 1, member: 2 };
      return rank[a.role ?? "member"] - rank[b.role ?? "member"];
    });

    setMembers(sorted);

    setEditingNames((prev) => {
      const next = { ...prev };
      for (const member of sorted) {
        if (next[member.uid] === undefined) {
          next[member.uid] = member.displayName ?? "";
        }
      }
      return next;
    });
  };

  const saveCompanyName = async () => {
    if (!companyId) return;

    try {
      setSaving(true);

      await updateDoc(doc(db, "companies", companyId), {
        name: companyName,
        updatedAt: new Date().toISOString(),
      });

      alert("会社名を保存しました");
    } catch (error) {
      console.error(error);
      alert("会社名の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const regenerateInviteCode = async () => {
    if (!companyId) return;

    try {
      setSaving(true);

      const newCode = Math.random().toString(36).slice(2, 10).toUpperCase();

      await updateDoc(doc(db, "companies", companyId), {
        inviteCode: newCode,
        updatedAt: new Date().toISOString(),
      });

      setInviteCode(newCode);
      alert("招待コードを再発行しました");
    } catch (error) {
      console.error(error);
      alert("招待コードの再発行に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const claimOwnerUid = async () => {
    if (!companyId || !myUid) return;

    try {
      setSaving(true);

      await updateDoc(doc(db, "companies", companyId), {
        ownerUid: myUid,
        updatedAt: new Date().toISOString(),
      });

      setOwnerUid(myUid);
      alert("ownerUid を設定しました");
    } catch (error) {
      console.error(error);
      alert("ownerUid の設定に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const saveDisplayName = async (targetUid: string) => {
    const nextName = editingNames[targetUid]?.trim();

    if (!nextName) {
      alert("表示名を入力してください");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "users", targetUid), {
        displayName: nextName,
        updatedAt: new Date().toISOString(),
      });

      await fetchMembers(companyId);
      alert("表示名を更新しました");
    } catch (error) {
      console.error(error);
      alert("表示名の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };
const changeRole = async (targetUid: string, nextRole: UserRole) => {
  if (!companyId) return;

  const target = members.find((m) => m.uid === targetUid);
  if (!target) return;

  const adminCount = members.filter((m) => m.role === "admin").length;

  // 自分自身をmemberに落とす事故を防ぐ
  if (targetUid === myUid && nextRole === "member") {
    alert("自分自身をmemberには変更できません");
    return;
  }

  // 最後のadminをmemberに落とすのを防ぐ
  if (
    target.role === "admin" &&
    nextRole === "member" &&
    adminCount <= 1
  ) {
    alert("最後のadminはmemberに変更できません");
    return;
  }

  try {
    setSaving(true);

    await updateDoc(doc(db, "users", targetUid), {
      role: nextRole,
      updatedAt: new Date().toISOString(),
    });

    await fetchMembers(companyId);
  } catch (error) {
    console.error(error);
    alert("権限変更に失敗しました");
  } finally {
    setSaving(false);
  }
};
  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <main className="p-4 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">会社管理</h1>

      <section className="border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">会社情報</h2>

        <div>
          <div className="text-sm text-gray-500">Company ID</div>
          <div className="text-sm break-all">{companyId}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Owner UID</div>
          <div className="text-sm break-all">{ownerUid || "未設定"}</div>
        </div>

        {!ownerUid && (
          <button
            type="button"
            className="w-full border rounded-lg py-2 mt-2"
            onClick={claimOwnerUid}
            disabled={saving}
          >
            このアカウントを ownerUid に設定
          </button>
        )}

        <div>
          <div className="text-sm text-gray-500">会社名</div>
          <input
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <button
            className="mt-2 w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50"
            onClick={saveCompanyName}
            disabled={saving}
            type="button"
          >
            保存
          </button>
        </div>
      </section>

      <section className="border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">招待コード</h2>

        <div className="text-lg font-mono tracking-widest">{inviteCode}</div>

        <button
          className="w-full border rounded-lg py-2 disabled:opacity-50"
          onClick={regenerateInviteCode}
          disabled={saving}
          type="button"
        >
          再発行
        </button>
      </section>

      <section className="border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">メンバー管理</h2>

        <div className="space-y-3">
          {members.map((member) => {
            const canEdit = myRole === "admin" && member.uid !== myUid;

            return (
              <div
                key={member.uid}
                className="border rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">表示名</div>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border rounded-lg px-3 py-2"
                        value={editingNames[member.uid] ?? ""}
                        onChange={(e) =>
                          setEditingNames((prev) => ({
                            ...prev,
                            [member.uid]: e.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                      <button
                        type="button"
                        className="border rounded-lg px-3 py-2"
                        onClick={() => saveDisplayName(member.uid)}
                        disabled={saving}
                      >
                        保存
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">メール</div>
                    <div className="text-sm text-gray-700 break-all">
                      {member.email || "メール未設定"}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 break-all">
                    UID: {member.uid}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <select
                      className="border rounded-lg px-3 py-2"
                      value={member.role}
                      onChange={(e) =>
                        changeRole(member.uid, e.target.value as UserRole)
                      }
                      disabled={saving}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm">
                      {member.role}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="pt-2">
        <button
          type="button"
          className="w-full border rounded-lg py-3"
          onClick={() => router.push("/reserve")}
        >
          予約画面に戻る
        </button>
      </div>
    </main>
  );
}