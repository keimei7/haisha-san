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

type UserRole = "owner" | "admin" | "member" | "pending";

type Member = {
  uid: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
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

        const role = (userData.role ?? "pending") as UserRole;

        if (role !== "owner" && role !== "admin") {
          router.replace("/");
          return;
        }

        const currentCompanyId = userData.companyId as string;

        setCompanyId(currentCompanyId);
        setMyRole(role);

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
      };
    });

    const sorted = list.sort((a, b) => {
      const rank: Record<UserRole, number> = {
        owner: 0,
        admin: 1,
        member: 2,
        pending: 3,
      };
      return rank[a.role ?? "pending"] - rank[b.role ?? "pending"];
    });

    setMembers(sorted);
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

  const changeRole = async (targetUid: string, nextRole: UserRole) => {
    if (!companyId) return;

    const target = members.find((m) => m.uid === targetUid);
    if (!target) return;

    if (target.uid === ownerUid || target.role === "owner") {
      alert("ownerの権限はここでは変更できません");
      return;
    }

    if (targetUid === myUid) {
      alert("自分自身の権限はここでは変更できません");
      return;
    }

    if (myRole === "admin" && nextRole === "admin") {
      alert("adminへの変更はownerのみ可能です");
      return;
    }

    if (myRole === "admin" && target.role === "admin") {
      alert("他のadminの権限変更はownerのみ可能です");
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

  const getEditableRoles = (member: Member): UserRole[] => {
    if (member.uid === ownerUid || member.role === "owner") {
      return ["owner"];
    }

    if (myRole === "owner") {
      return ["pending", "member", "admin"];
    }

    if (myRole === "admin") {
      if (member.role === "admin") {
        return ["admin"];
      }
      return ["pending", "member"];
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
          <div className="text-sm break-all">{ownerUid}</div>
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
        >
          再発行
        </button>
      </section>

      <section className="border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">メンバー管理</h2>

        <div className="space-y-3">
          {members.map((member) => {
            const canEdit = myRole === "owner" || myRole === "admin";
            const editableRoles = getEditableRoles(member);
            const isFixed =
              member.uid === ownerUid ||
              member.role === "owner" ||
              member.uid === myUid ||
              (myRole === "admin" && member.role === "admin");

            return (
              <div
                key={member.uid}
                className="border rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {member.displayName || "名前未設定"}
                  </div>
                  <div className="text-sm text-gray-500 break-all">
                    {member.email || "メール未設定"}
                  </div>
                  <div className="text-xs text-gray-400 break-all mt-1">
                    UID: {member.uid}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && !isFixed ? (
                    <select
                      className="border rounded-lg px-3 py-2"
                      value={member.role ?? "pending"}
                      onChange={(e) =>
                        changeRole(member.uid, e.target.value as UserRole)
                      }
                      disabled={saving}
                    >
                      {editableRoles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm">
                      {ROLE_LABEL[member.role ?? "pending"]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}