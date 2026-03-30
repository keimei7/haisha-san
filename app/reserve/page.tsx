"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/lib/firebase-client";
import { db } from "@/lib/firebase";
type TableItem = {
  id: string;
  title: string;
  labelMeta1: string;
  labelMeta2: string;
  sort?: number;
};

type AssetItem = {
  id: string;
  name: string;
  inspection: string;
  tableId: string;
  sort: number;
  assignedUser?: string;
};

type ReservationItem = {
  id: string;
  assetId: string;
  dayKey: string;
  userName: string;
  site: string;
  note: string;
};

type DayItem = {
  key: string;
  label: string;
  weekday: string;
  date: Date;
};

type ReservationSlot = {
  assetId: string;
  assetName: string;
  dayKeys: string[];
  dateLabel: string;
};

type SelectedSlot = ReservationSlot | null;

type DragState = {
  assetId: string;
  assetName: string;
  startIndex: number;
  currentIndex: number;
} | null;

type UserDoc = {
  companyId?: string;
  displayName?: string;
  name?: string;
};

type CreateTableModalProps = {
  onClose: () => void;
  onCreate: (table: {
    title: string;
    labelMeta1: string;
    labelMeta2: string;
  }) => void | Promise<void>;
};

type AddAssetModalProps = {
  onClose: () => void;
  onAdd: (asset: {
    name: string;
    inspection: string;
    tableId: string;
    assignedUser?: string;
  }) => void | Promise<void>;
  tableId: string;
  memberOptions: string[];
};

type ReservationModalProps = {
  slot: ReservationSlot;
  existing?: ReservationItem;
  memberOptions: string[];
  onClose: () => void;
  onSave: (payload: {
    userName: string;
    site: string;
    note: string;
  }) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHeaderDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatWeekTitle(startDate: Date): string {
  return `${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()} 週`;
}

function makeDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function makeReservationDocId(assetId: string, dayKey: string): string {
  return `${assetId}_${dayKey}`;
}

function rangeFromIndices(a: number, b: number): number[] {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function CreateTableModal({
  onClose,
  onCreate,
}: CreateTableModalProps) {
  const [title, setTitle] = useState("");
  const [meta1, setMeta1] = useState("車検");
  const [meta2, setMeta2] = useState("車種");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[200] pointer-events-auto">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative z-[201] pointer-events-auto">
        <h2 className="text-lg font-bold">テーブル作成</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">テーブル名</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="例：共有車予約ページ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">左ラベル1</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={meta1}
              onChange={(e) => setMeta1(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">左ラベル2</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={meta2}
              onChange={(e) => setMeta2(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium relative z-[300]"
            onClick={() => {
              if (!title.trim()) {
                alert("テーブル名を入れてください");
                return;
              }
              onCreate({
                title: title.trim(),
                labelMeta1: meta1.trim() || "車検",
                labelMeta2: meta2.trim() || "車種",
              });
            }}
            type="button"
          >
            作成
          </button>

          <button
            className="rounded-lg border px-4 py-2 relative z-[300]"
            onClick={onClose}
            type="button"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAssetModal({
  onClose,
  onAdd,
  tableId,
  memberOptions,
}: AddAssetModalProps) {
  const [name, setName] = useState("");
  const [inspection, setInspection] = useState("");
  const [assignedUser, setAssignedUser] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[200] pointer-events-auto">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative z-[201] pointer-events-auto">
        <h2 className="text-lg font-bold">資産追加</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">名前</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="例：12tセルフ"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">割り当て</label>
            <div className="relative">
              <select
                className="w-full border rounded-lg px-3 py-2 pr-10 appearance-none bg-white"
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
              >
                <option value="">共有車</option>
                {memberOptions.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                ▼
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">点検・車検</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="例：2026/03/18"
              value={inspection}
              onChange={(e) => setInspection(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium relative z-[300]"
            onClick={() => {
              if (!name.trim()) {
                alert("名前を入れてください");
                return;
              }
              onAdd({
                name: name.trim(),
                inspection: inspection.trim(),
                tableId,
                assignedUser: assignedUser || undefined,
              });
            }}
            type="button"
          >
            追加
          </button>

          <button
            className="rounded-lg border px-4 py-2 relative z-[300]"
            onClick={onClose}
            type="button"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationModal({
  slot,
  existing,
  memberOptions,
  onClose,
  onSave,
  onDelete,
}: ReservationModalProps) {
  const [userName, setUserName] = useState(existing?.userName ?? "");
  const [site, setSite] = useState(existing?.site ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] px-4 pointer-events-auto">
      <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl relative z-[201] pointer-events-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">予約入力</h2>
            <p className="text-sm text-gray-500">
              {slot.assetName}
              <br />
              {slot.dateLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-500 hover:text-black px-2 relative z-[300]"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">予約者名</label>
            <div className="relative">
              <select
                className="w-full border rounded-lg px-3 py-2 pr-10 appearance-none bg-white"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              >
                <option value="">選択してください</option>
                {memberOptions.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                ▼
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">行先</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="例：現場A"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">用途・備考</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：打合せ"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium relative z-[300]"
            onClick={() => {
              if (!userName.trim()) {
                alert("予約者を選択してください");
                return;
              }
              onSave({
                userName: userName.trim(),
                site: site.trim(),
                note: note.trim(),
              });
            }}
            type="button"
          >
            決定
          </button>

          <button
            className="rounded-lg border px-4 py-2 relative z-[300]"
            onClick={onClose}
            type="button"
          >
            閉じる
          </button>
        </div>

        <button
          className="w-full border border-red-400 text-red-500 py-2 rounded-lg relative z-[300]"
          onClick={onDelete}
          type="button"
        >
          この予約を削除
        </button>
      </div>
    </div>
  );
}

export default function ReservePage() {
  const router = useRouter();
  const [uid, setUid] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);

  const [tables, setTables] = useState<TableItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [memberOptions, setMemberOptions] = useState<string[]>([]);

  const [currentTableId, setCurrentTableId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));

  const [showCreateTable, setShowCreateTable] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null);

  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [dragState, setDragState] = useState<DragState>(null);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        setUid("");
        setCompanyId("");
        setAuthLoading(false);
        router.push("/login");
        return;
      }

      setUid(user.uid);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error("users/{uid} が存在しません");
        setCompanyId("");
        setAuthLoading(false);
        return;
      }

      const data = userSnap.data() as UserDoc;
      setCompanyId(data.companyId ?? "");
      setAuthLoading(false);
    } catch (error) {
      console.error("auth/company read error:", error);
      setCompanyId("");
      setAuthLoading(false);
    }
  });

  return () => unsub();
}, [router]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "users"),
      where("companyId", "==", companyId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const names = snap.docs
          .map((docSnap) => {
            const data = docSnap.data() as UserDoc;
            return data.displayName ?? data.name ?? "";
          })
          .filter(Boolean);

        setMemberOptions(names);
      },
      (error) => {
        console.error("users snapshot error:", error);
        setMemberOptions([]);
      }
    );

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    setLoadingTables(true);

    const q = query(
      collection(db, "tables"),
      where("companyId", "==", companyId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: TableItem[] = snap.docs
          .map((docSnap) => {
            const data = docSnap.data() as {
              title?: string;
              labelMeta1?: string;
              labelMeta2?: string;
              sort?: number;
            };

            return {
              id: docSnap.id,
              title: data.title ?? "無題",
              labelMeta1: data.labelMeta1 ?? "車検",
              labelMeta2: data.labelMeta2 ?? "車種",
              sort: data.sort ?? 0,
            };
          })
          .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

        setTables(list);

        if (list.length > 0) {
          setCurrentTableId((prev) =>
            prev && list.some((t) => t.id === prev) ? prev : list[0].id
          );
        } else {
          setCurrentTableId("");
        }

        setLoadingTables(false);
      },
      (error) => {
        console.error("tables snapshot error:", error);
        setTables([]);
        setLoadingTables(false);
      }
    );

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    setLoadingAssets(true);

    const q = query(
      collection(db, "assets"),
      where("companyId", "==", companyId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AssetItem[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as {
            name?: string;
            inspection?: string;
            tableId?: string;
            sort?: number;
            assignedUser?: string | null;
          };

          return {
            id: docSnap.id,
            name: data.name ?? "",
            inspection: data.inspection ?? "",
            tableId: data.tableId ?? "",
            sort: data.sort ?? 0,
            assignedUser: data.assignedUser ?? undefined,
          };
        });

        setAssets(list);
        setLoadingAssets(false);
      },
      (error) => {
        console.error("assets snapshot error:", error);
        setAssets([]);
        setLoadingAssets(false);
      }
    );

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    setLoadingReservations(true);

    const q = query(
      collection(db, "reservations"),
      where("companyId", "==", companyId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReservationItem[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as {
            assetId?: string;
            dayKey?: string;
            userName?: string;
            site?: string;
            note?: string;
          };

          return {
            id: docSnap.id,
            assetId: data.assetId ?? "",
            dayKey: data.dayKey ?? "",
            userName: data.userName ?? "",
            site: data.site ?? "",
            note: data.note ?? "",
          };
        });

        setReservations(list);
        setLoadingReservations(false);
      },
      (error) => {
        console.error("reservations snapshot error:", error);
        setReservations([]);
        setLoadingReservations(false);
      }
    );

    return () => unsub();
  }, [companyId]);

  const currentTable = tables.find((t) => t.id === currentTableId);

  const days: DayItem[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        key: makeDayKey(date),
        label: formatHeaderDate(date),
        weekday: ["月", "火", "水", "木", "金", "土", "日"][i],
        date,
      };
    });
  }, [weekStart]);

  const currentTableAssets = useMemo(() => {
    return [...assets]
      .filter((a) => a.tableId === currentTableId)
      .sort((a, b) => a.sort - b.sort);
  }, [assets, currentTableId]);

  const sharedAssets = useMemo(() => {
    return currentTableAssets.filter((a) => !a.assignedUser);
  }, [currentTableAssets]);

  const myAssets = useMemo(() => {
    return currentTableAssets.filter((a) => !!a.assignedUser);
  }, [currentTableAssets]);

  const dragSelectedDayKeys = useMemo(() => {
    if (!dragState) return [];
    return rangeFromIndices(dragState.startIndex, dragState.currentIndex)
      .map((index) => days[index]?.key)
      .filter(Boolean);
  }, [dragState, days]);

  const isLoading =
    authLoading || loadingTables || loadingAssets || loadingReservations;

  const openSlotFromIndices = (
    assetId: string,
    assetName: string,
    startIndex: number,
    endIndex: number
  ) => {
    const indices = rangeFromIndices(startIndex, endIndex);
    const selectedDays = indices.map((index) => days[index]).filter(Boolean);

    if (selectedDays.length === 0) return;

    const first = selectedDays[0];
    const last = selectedDays[selectedDays.length - 1];

    const dateLabel =
      selectedDays.length === 1
        ? `${first.label}（${first.weekday}）`
        : `${first.label}（${first.weekday}）〜 ${last.label}（${last.weekday}）`;

    setSelectedSlot({
      assetId,
      assetName,
      dayKeys: selectedDays.map((d) => d.key),
      dateLabel,
    });
  };

  const handleCellMouseDown = (
    assetId: string,
    assetName: string,
    dayIndex: number
  ) => {
    setDragState({
      assetId,
      assetName,
      startIndex: dayIndex,
      currentIndex: dayIndex,
    });
  };

  const handleCellMouseEnter = (assetId: string, dayIndex: number) => {
    setDragState((prev) => {
      if (!prev) return prev;
      if (prev.assetId !== assetId) return prev;
      return {
        ...prev,
        currentIndex: dayIndex,
      };
    });
  };

  const handleCellMouseUp = (assetId: string) => {
    if (!dragState) return;
    if (dragState.assetId !== assetId) return;

    openSlotFromIndices(
      dragState.assetId,
      dragState.assetName,
      dragState.startIndex,
      dragState.currentIndex
    );
    setDragState(null);
  };

  useEffect(() => {
    const clearDrag = () => setDragState(null);
    window.addEventListener("mouseup", clearDrag);
    return () => window.removeEventListener("mouseup", clearDrag);
  }, []);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white text-black p-6">
        <div className="mx-auto max-w-md text-center text-gray-500">
          認証確認中...
        </div>
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="min-h-screen bg-white text-black p-6">
        <div className="mx-auto max-w-md text-center text-gray-500">
          ログインしてください
        </div>
      </main>
    );
  }

  if (!companyId) {
    return (
      <main className="min-h-screen bg-white text-black p-6">
        <div className="mx-auto max-w-md text-center text-gray-500 space-y-2">
          <div>companyId が取得できませんでした</div>
          <div className="text-xs">
            users/{uid} に companyId が入っているか確認してください
          </div>
        </div>
      </main>
    );
  }

  if (loadingTables && tables.length === 0) {
    return (
      <main className="min-h-screen bg-white text-black p-6">
        <div className="mx-auto max-w-md text-center text-gray-500">
          読み込み中...
        </div>
      </main>
    );
  }

  if (tables.length === 0) {
    return (
      <main className="min-h-screen bg-white text-black p-3">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border overflow-hidden bg-white">
            <div className="py-3 flex items-center justify-center gap-2 border-b bg-white">
              <img
                src="/icon.png"
                alt="配車さん"
                className="w-12 h-12 object-contain"
              />
              <div className="font-bold text-2xl tracking-wide">配車さん</div>
            </div>

            <div className="bg-yellow-300 text-center font-bold py-3 text-xl border-b">
              AssetTable初期設定
            </div>

            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-gray-600">
                まず最初のテーブルを作成してください
              </p>

              <button
                onClick={() => setShowCreateTable(true)}
                className="w-full rounded-xl border bg-white py-3 text-sm"
                type="button"
              >
                テーブルを作る
              </button>
            </div>
          </div>
        </div>

        {showCreateTable && (
          <CreateTableModal
            onClose={() => setShowCreateTable(false)}
            onCreate={async (table) => {
              try {
                const docRef = await addDoc(collection(db, "tables"), {
                  title: table.title,
                  labelMeta1: table.labelMeta1,
                  labelMeta2: table.labelMeta2,
                  companyId,
                  sort: Date.now(),
                });

                setCurrentTableId(docRef.id);
                setShowCreateTable(false);
              } catch (error) {
                console.error("table create error:", error);
                alert(`テーブル作成に失敗しました: ${String(error)}`);
              }
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black p-3">
      <div className="mx-auto max-w-md">
        <div className="mb-3 rounded-2xl border overflow-hidden bg-white">
          <div className="py-3 flex items-center justify-center gap-2 border-b bg-white">
            <img
              src="/icon.png"
              alt="配車さん"
              className="w-12 h-12 object-contain"
            />
            <div className="font-bold text-2xl tracking-wide">配車さん</div>
          </div>

          <div className="bg-yellow-300 text-center font-bold py-3 text-xl border-b">
            {currentTable?.title ?? "AssetTable"}
          </div>

          <div className="p-3 space-y-3 bg-white">
            {tables.length > 1 && (
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {tables.map((table) => {
                    const active = table.id === currentTableId;
                    return (
                      <button
                        key={table.id}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          active ? "bg-black text-white" : "bg-white text-black"
                        }`}
                        onClick={() => setCurrentTableId(table.id)}
                        type="button"
                      >
                        {table.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border bg-white py-2.5 text-sm"
                onClick={() => setShowCreateTable(true)}
                type="button"
              >
                ＋ テーブル追加
              </button>

              <button
                className="rounded-xl border bg-white py-2.5 text-sm"
                onClick={() => setShowAddAsset(true)}
                type="button"
              >
                ＋ 資産追加
              </button>
            </div>

            {isLoading && <div className="text-xs text-gray-500">同期中...</div>}
          </div>

          <div className="flex items-center justify-between px-3 py-3 bg-gray-50 border-t">
            <button
              className="rounded-xl border bg-white px-4 py-2"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              type="button"
            >
              ←
            </button>

            <div className="font-semibold text-lg">
              {formatWeekTitle(weekStart)}
            </div>

            <button
              className="rounded-xl border bg-white px-4 py-2"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              type="button"
            >
              →
            </button>
          </div>
        </div>

        {currentTableAssets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              このテーブルにはまだ資産がありません
            </p>
            <button
              onClick={() => setShowAddAsset(true)}
              className="rounded-xl border bg-white px-4 py-2 text-sm"
              type="button"
            >
              資産を追加する
            </button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm min-w-[760px] w-full select-none">
                <thead>
                  <tr>
                    <th className="border bg-red-500 text-white px-2 py-2 w-16">
                      {currentTable?.labelMeta1 ?? "車検"}
                    </th>

                    <th className="sticky left-0 z-20 border bg-green-600 text-white px-2 py-2 w-24">
                      {currentTable?.labelMeta2 ?? "車種"}
                    </th>

                    {days.map((day) => {
                      const isSunday = day.date.getDay() === 0;
                      const isSaturday = day.date.getDay() === 6;

                      const headerBg = isSunday
                        ? "bg-red-100"
                        : isSaturday
                        ? "bg-blue-100"
                        : "bg-gray-100";

                      const weekdayColor = isSunday
                        ? "text-red-600"
                        : isSaturday
                        ? "text-blue-600"
                        : "text-black";

                      return (
                        <th
                          key={day.key}
                          className={`border px-2 py-2 min-w-[92px] ${headerBg}`}
                        >
                          <div className="font-bold">{day.label}</div>
                          <div className={weekdayColor}>{day.weekday}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {sharedAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="border px-2 py-3 text-center align-middle whitespace-nowrap bg-white">
                        {asset.inspection}
                      </td>

                      <td className="sticky left-0 z-10 border px-2 py-3 text-center align-middle whitespace-pre-line bg-gray-50">
                        {asset.name}
                      </td>

                      {days.map((day, dayIndex) => {
                        const isSunday = day.date.getDay() === 0;
                        const isSaturday = day.date.getDay() === 6;

                        const defaultBg = isSunday
                          ? "bg-red-50"
                          : isSaturday
                          ? "bg-blue-50"
                          : "bg-white";

                        const reservation = reservations.find(
                          (r) => r.assetId === asset.id && r.dayKey === day.key
                        );

                        const isDragged =
                          dragState?.assetId === asset.id &&
                          dragSelectedDayKeys.includes(day.key);

                        const cellBg = isDragged
                          ? "bg-yellow-100"
                          : reservation
                          ? "bg-blue-50"
                          : defaultBg;

                        return (
                          <td
                            key={`${asset.id}-${day.key}`}
                            className={`border p-1 align-top ${cellBg}`}
                            onMouseEnter={() =>
                              handleCellMouseEnter(asset.id, dayIndex)
                            }
                            onMouseUp={() => handleCellMouseUp(asset.id)}
                          >
                            <button
                              className="w-full min-h-[64px] rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 active:scale-[0.99] text-left p-2"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleCellMouseDown(asset.id, asset.name, dayIndex);
                              }}
                              type="button"
                            >
                              <div className="space-y-1">
                                {reservation ? (
                                  <div className="space-y-1">
                                    {reservation.site && (
                                      <div className="font-bold text-sm">
                                        {reservation.site}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-700">
                                      {reservation.userName}
                                    </div>
                                    {reservation.note && (
                                      <div className="text-xs text-gray-500">
                                        {reservation.note}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    ＋予約
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 text-xs text-gray-500 border-t">
              セルをドラッグすると複数日まとめて予約できます
            </div>
          </div>
        )}

        {myAssets.length > 0 && (
          <div className="mt-4 rounded-2xl border bg-white p-4 space-y-3">
            <h3 className="font-bold">マイカー</h3>

            <div className="space-y-2">
              {myAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-xl border px-3 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-gray-500">
                      {asset.inspection || "点検情報なし"}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {asset.assignedUser}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          資産件数: {currentTableAssets.length} / 共有車: {sharedAssets.length} /
          マイカー: {myAssets.length} / 予約件数: {reservations.length}
        </p>
      </div>

      {selectedSlot && (
        <ReservationModal
          slot={selectedSlot}
          existing={
            selectedSlot.dayKeys.length === 1
              ? reservations.find(
                  (r) =>
                    r.assetId === selectedSlot.assetId &&
                    r.dayKey === selectedSlot.dayKeys[0]
                )
              : undefined
          }
          memberOptions={memberOptions}
          onClose={() => setSelectedSlot(null)}
          onSave={async ({ userName, site, note }) => {
            if (!selectedSlot) return;

            try {
              await Promise.all(
                selectedSlot.dayKeys.map((dayKey) =>
                  setDoc(
                    doc(
                      db,
                      "reservations",
                      makeReservationDocId(selectedSlot.assetId, dayKey)
                    ),
                    {
                      assetId: selectedSlot.assetId,
                      dayKey,
                      userName,
                      site,
                      note,
                      companyId,
                    }
                  )
                )
              );
              setSelectedSlot(null);
            } catch (error) {
              console.error("reservation save error:", error);
              alert(`予約保存に失敗しました: ${String(error)}`);
            }
          }}
          onDelete={async () => {
            if (!selectedSlot) return;

            try {
              await Promise.all(
                selectedSlot.dayKeys.map((dayKey) =>
                  deleteDoc(
                    doc(
                      db,
                      "reservations",
                      makeReservationDocId(selectedSlot.assetId, dayKey)
                    )
                  )
                )
              );
              setSelectedSlot(null);
            } catch (error) {
              console.error("reservation delete error:", error);
              alert(`予約削除に失敗しました: ${String(error)}`);
            }
          }}
        />
      )}

      {showCreateTable && (
        <CreateTableModal
          onClose={() => setShowCreateTable(false)}
          onCreate={async (table) => {
            try {
              const docRef = await addDoc(collection(db, "tables"), {
                title: table.title,
                labelMeta1: table.labelMeta1,
                labelMeta2: table.labelMeta2,
                companyId,
                sort: Date.now(),
              });

              setCurrentTableId(docRef.id);
              setShowCreateTable(false);
            } catch (error) {
              console.error("table create error:", error);
              alert(`テーブル作成に失敗しました: ${String(error)}`);
            }
          }}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          onClose={() => setShowAddAsset(false)}
          onAdd={async (asset) => {
            try {
              await addDoc(collection(db, "assets"), {
                name: asset.name,
                inspection: asset.inspection,
                tableId: asset.tableId,
                assignedUser: asset.assignedUser ?? null,
                sort: Date.now(),
                companyId,
              });

              setShowAddAsset(false);
            } catch (error) {
              console.error("asset add error:", error);
              alert(`資産追加に失敗しました: ${String(error)}`);
            }
          }}
          tableId={currentTableId}
          memberOptions={memberOptions}
        />
      )}
    </main>
  );
}