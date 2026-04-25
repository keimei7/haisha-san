"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserDoc = { companyId?: string; displayName?: string; name?: string; role?: string };

type AssetItem = {
  id: string;
  name: string;
  subLabel?: string;
  tableId: string;
  assignedUser?: string | null;
};

type PhotoSlotItem = {
  id: string;
  title: string;
  groupLabel: string;
  sort: number;
  tableId?: string;
};

type PhotoLogItem = {
  id: string;
  assetId: string;
  slotId: string;
  dateKey: string;
  photoUrl: string;
};

function makeDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function escapeCsv(value: string): string {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DailyPhotosPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [myRole, setMyRole] = useState<string>("member");

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [slots, setSlots] = useState<PhotoSlotItem[]>([]);
  const [logs, setLogs] = useState<PhotoLogItem[]>([]);

  const todayKey = useMemo(() => makeDayKey(new Date()), []);

  // auth → companyId
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) {
        router.replace("/setup");
        return;
      }
      const data = userSnap.data() as UserDoc;
      if (!data.companyId) {
        router.replace("/setup");
        return;
      }
      setCompanyId(data.companyId);
      setMyRole(data.role ?? "member");
    });
    return () => unsub();
  }, [router]);

  // assets（割り当て済みだけ見せる前提で読む）
  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, "assets"), where("companyId", "==", companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list: AssetItem[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? "",
          subLabel: data.subLabel ?? "",
          tableId: data.tableId ?? "",
          assignedUser: data.assignedUser ?? null,
        };
      });
      setAssets(list);
    });
    return () => unsub();
  }, [companyId]);

  // photoSlots
  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, "photoSlots"), where("companyId", "==", companyId));
    const unsub = onSnapshot(q, (snap) => {
      const list: PhotoSlotItem[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title ?? "",
            groupLabel: data.groupLabel ?? "",
            sort: data.sort ?? 0,
            tableId: data.tableId ?? "",
          };
        })
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      setSlots(list);
    });
    return () => unsub();
  }, [companyId]);

  // photoLogs（今日だけ）
  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, "photoLogs"),
      where("companyId", "==", companyId),
      where("dateKey", "==", todayKey)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: PhotoLogItem[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          assetId: data.assetId ?? "",
          slotId: data.slotId ?? "",
          dateKey: data.dateKey ?? "",
          photoUrl: data.photoUrl ?? "",
        };
      });
      setLogs(list);
    });
    return () => unsub();
  }, [companyId, todayKey]);

  // 表の対象＝割り当て済みアセット
  const rows = useMemo(() => {
    return assets
      .filter((a) => !!a.assignedUser)
      .sort((a, b) => (a.assignedUser ?? "").localeCompare(b.assignedUser ?? ""));
  }, [assets]);

  // そのアセットのtableIdに合うslotだけを列にする（tableId未設定は共通）
  const slotsByTable = useMemo(() => {
    const map = new Map<string, PhotoSlotItem[]>();
    for (const a of rows) {
      const target = slots.filter((s) => !s.tableId || s.tableId === a.tableId);
      map.set(a.id, target);
    }
    return map;
  }, [rows, slots]);

  // CSV出力：行=人/アセット、列=slotタイトル（提出済みなら1）
  const exportTodayCsv = () => {
    const allSlotTitles = slots.map((s) =>
      s.groupLabel ? `${s.groupLabel}/${s.title}` : s.title
    );

    const header = ["担当", "アセット", "識別", ...allSlotTitles];

    const body = rows.map((a) => {
      const row = [a.assignedUser ?? "", a.name, a.subLabel ?? ""];
      for (const s of slots) {
        const ok = logs.some(
          (l) => l.assetId === a.id && l.slotId === s.id && l.dateKey === todayKey
        );
        row.push(ok ? "1" : "");
      }
      return row;
    });

    const csv = [header, ...body]
      .map((r) => r.map((c) => escapeCsv(c)).join(","))
      .join("\n");

    downloadCsv(`写真提出_${todayKey}.csv`, csv);
  };

  // 表の列：見た目は「全slot」を共通列にしておくとテンプレとして一貫する
  const colSlots = slots;

  return (
    <main className="min-h-screen bg-white text-black p-3">
      <div className="mx-auto max-w-[980px] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-bold">本日の写真提出一覧</div>
            <div className="text-xs text-gray-500">{todayKey}</div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border bg-white px-3 py-2 text-sm"
              onClick={() => router.push("/reserve")}
              type="button"
            >
              戻る
            </button>

            <button
              className="rounded-lg border bg-white px-3 py-2 text-sm"
              onClick={exportTodayCsv}
              type="button"
            >
              CSV出力
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-white overflow-auto">
          <table className="min-w-[920px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 border bg-gray-50 px-2 py-2 text-left w-[120px]">
                  担当
                </th>
                <th className="sticky top-0 z-10 border bg-gray-50 px-2 py-2 text-left w-[180px]">
                  アセット
                </th>
                <th className="sticky top-0 z-10 border bg-gray-50 px-2 py-2 text-left w-[120px]">
                  識別
                </th>

                {colSlots.map((s) => (
                  <th
                    key={s.id}
                    className="sticky top-0 z-10 border bg-gray-50 px-2 py-2 text-center min-w-[120px]"
                  >
                    <div className="text-[11px] leading-tight">
                      {s.groupLabel ? `${s.groupLabel}/${s.title}` : s.title}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="border px-2 py-2">{a.assignedUser ?? ""}</td>
                  <td className="border px-2 py-2">{a.name}</td>
                  <td className="border px-2 py-2 text-gray-600">
                    {a.subLabel ?? ""}
                  </td>

                  {colSlots.map((s) => {
                    const target = !s.tableId || s.tableId === a.tableId;
                    const ok =
                      target &&
                      logs.some(
                        (l) =>
                          l.assetId === a.id &&
                          l.slotId === s.id &&
                          l.dateKey === todayKey
                      );

                    return (
                      <td key={s.id} className="border px-2 py-2 text-center">
                        {!target ? (
                          <span className="text-gray-300">—</span>
                        ) : ok ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 px-2 py-1 text-xs">
                            ×
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500">
          ※ 写真枠の tableId が違うものは「—」になります（車以外のテーブル混入防止）。
        </div>
      </div>
    </main>
  );
}