"use client";

import { useEffect, useMemo, useState } from "react";
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

type UserRole = "owner" | "admin" | "member" | "pending";

type Member = {
  uid: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
};

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "社員",
  pending: "承認待ち",
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

  const activeAdminCount = useMemo(() => {
    return members.filter(
      (m) => m.role === "admin" && (m.isActive ?? true)
    ).length;
  }, [members]);

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

        const currentRole = (userData.role ?? "pending") as UserRole;

        if (currentRole !== "owner" && currentRole !== "admin") {
          router.replace("/");
          return;
        }

        const currentCompanyId = userData.companyId as string;

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
        role: (data.role ?? "pending") as UserRole,
        isActive: data.isActive ?? true,
      };
    });

    const rank: Record<UserRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
      pending: 3,
    };

    const sorted = list.sort((a, b) => {
      return rank[a.role ?? "pending"] - rank[b.role ?? "pending"];
    });

    setMembers(sorted);

    setEditingNames((prev) => {
      const next = { ...prev };
      for (const member of sorted) {
        next[member.uid] = next[member.uid] ?? member.displayName ?? "";
      }
      return next;
    });
  };

  const saveCompanyName = async () => {
    if (!companyId) return;

    try {
      setSaving(true);

      await updateDoc(doc(db, "companies", companyId), {
        name: companyName.trim(),
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

  const saveDisplayName = async (targetUid: string) => {
    if (!companyId) return;

    const nextName = editingNames[targetUid]?.trim();

    if (!nextName) {
      alert("表示名を入力してください");
      return;
    }

    const target = members.find((m) => m.uid === targetUid);
    if (!target) return;

    const isOwner = target.uid === ownerUid || target.role === "owner";
    const isSelf = target.uid === myUid;

    if (isOwner || isSelf) {
      alert("このユーザーの表示名は編集できません");
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

    const currentRole = target.role ?? "pending";
    const isOwner = target.uid === ownerUid || currentRole === "owner";
    const isSelf = target.uid === myUid;
    const isActive = target.isActive ?? true;
    const isDroppingAdmin = currentRole === "admin" && nextRole !== "admin";

    if (isOwner) {
      alert("ownerの権限はここでは変更できません");
      return;
    }

    if (isSelf) {
      alert("自分自身の権限はここでは変更できません");
      return;
    }

    if (isDroppingAdmin && isActive && activeAdminCount <= 1) {
      alert("最後の有効 admin は降格できません");
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

  const toggleMemberActive = async (targetUid: string, nextActive: boolean) => {
    if (!companyId) return;

    const target = members.find((m) => m.uid === targetUid);
    if (!target) return;

    const currentRole = target.role ?? "pending";
    const isOwner = target.uid === ownerUid || currentRole === "owner";
    const isSelf = target.uid === myUid;
    const isCurrentlyActive = target.isActive ?? true;
    const isLastActiveAdmin =
      currentRole === "admin" &&
      isCurrentlyActive &&
      !nextActive &&
      activeAdminCount <= 1;

    if (isOwner) {
      alert("ownerは無効化できません");
      return;
    }

    if (isSelf) {
      alert("自分自身は無効化できません");
      return;
    }

    if (isLastActiveAdmin) {
      alert("最後の有効 admin は無効化できません");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "users", targetUid), {
        isActive: nextActive,
        updatedAt: new Date().toISOString(),
      });

      await fetchMembers(companyId);
      alert(nextActive ? "ユーザーを復活しました" : "ユーザーを無効化しました");
    } catch (error) {
      console.error(error);
      alert("ユーザー状態の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const getEditableRoles = (member: Member): UserRole[] => {
    if (member.uid === ownerUid || member.role === "owner") {
      return ["owner"];
    }

    if (myRole === "owner" || myRole === "admin") {
      return ["pending", "member", "admin"];
    }

    return [member.role ?? "pending"];
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
            const role = member.role ?? "pending";
            const isOwner = member.uid === ownerUid || role === "owner";
            const isSelf = member.uid === myUid;
            const isActive = member.isActive ?? true;

            const canEditRole =
              !isOwner &&
              !isSelf &&
              (myRole === "owner" || myRole === "admin");

            const canEditName =
              !isOwner &&
              !isSelf &&
              (myRole === "owner" || myRole === "admin");

            const canToggleActive =
              !isOwner &&
              !isSelf &&
              (myRole === "owner" || myRole === "admin");

            const editableRoles = getEditableRoles(member);

            return (
              <div
                key={member.uid}
                className="border rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">表示名</div>
                    {canEditName ? (
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
                    ) : (
                      <div className="border rounded-lg px-3 py-2 bg-gray-50">
                        {member.displayName || "名前未設定"}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">メール</div>
                    <div className="text-sm text-gray-700 break-all">
                      {member.email || "メール未設定"}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    状態: {isActive ? "有効" : "無効"}
                  </div>

                  <div className="text-xs text-gray-400">
                    権限: {ROLE_LABEL[role]}
                  </div>

                  <div className="text-xs text-gray-400 break-all">
                    UID: {member.uid}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {canEditRole ? (
                    <select
                      className="border rounded-lg px-3 py-2"
                      value={role}
                      onChange={(e) =>
                        changeRole(member.uid, e.target.value as UserRole)
                      }
                      disabled={saving || !isActive}
                    >
                      {editableRoles.map((candidateRole) => (
                        <option key={candidateRole} value={candidateRole}>
                          {ROLE_LABEL[candidateRole]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-center">
                      {ROLE_LABEL[role]}
                    </div>
                  )}

                  {canToggleActive && (
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        isActive
                          ? "border-red-300 text-red-600"
                          : "border-green-300 text-green-600"
                      }`}
                      onClick={() =>
                        toggleMemberActive(member.uid, !isActive)
                      }
                      disabled={saving}
                    >
                      {isActive ? "無効化" : "復活"}
                    </button>
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