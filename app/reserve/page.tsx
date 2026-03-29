"use client";

import { useMemo, useState } from "react";

type TableItem = {
  id: string;
  title: string;
  labelMeta1: string;
  labelMeta2: string;
};

type AssetItem = {
  id: string;
  name: string;
  inspection: string;
  tableId: string;
  sort: number;
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
  dayKey: string;
  dateLabel: string;
};

type SelectedSlot = ReservationSlot | null;

type CreateTableModalProps = {
  onClose: () => void;
  onCreate: (table: TableItem) => void;
};

type AddAssetModalProps = {
  onClose: () => void;
  onAdd: (asset: AssetItem) => void;
  tableId: string;
};

type ReservationModalProps = {
  slot: ReservationSlot;
  existing?: ReservationItem;
  onClose: () => void;
  onSave: (payload: {
    userName: string;
    site: string;
    note: string;
  }) => void;
  onDelete: () => void;
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

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatHeaderDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatWeekTitle(startDate: Date): string {
  return `${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()} 週`;
}

function CreateTableModal({
  onClose,
  onCreate,
}: CreateTableModalProps) {
  const [title, setTitle] = useState("");
  const [meta1, setMeta1] = useState("車検");
  const [meta2, setMeta2] = useState("車種");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[200]">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
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
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
            disabled={!title.trim()}
            onClick={() => {
              if (!title.trim()) return;
              onCreate({
                id: makeId(),
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
            className="rounded-lg border px-4 py-2"
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
}: AddAssetModalProps) {
  const [name, setName] = useState("");
  const [inspection, setInspection] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[200]">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
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
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => {
              if (!name.trim()) return;
              onAdd({
                id: makeId(),
                name: name.trim(),
                inspection: inspection.trim(),
                tableId,
                sort: Date.now(),
              });
            }}
            type="button"
          >
            追加
          </button>

          <button
            className="rounded-lg border px-4 py-2"
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
  onClose,
  onSave,
  onDelete,
}: ReservationModalProps) {
  if (!slot) return null;

  const [userName, setUserName] = useState(existing?.userName ?? "");
  const [site, setSite] = useState(existing?.site ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] px-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
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
            className="text-2xl leading-none text-gray-500 hover:text-black px-2"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">予約者名</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="例：あああ"
            />
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
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium"
            onClick={() =>
              onSave({
                userName: userName.trim(),
                site: site.trim(),
                note: note.trim(),
              })
            }
            type="button"
          >
            決定
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            onClick={onClose}
            type="button"
          >
            閉じる
          </button>
        </div>

        <button
          className="w-full border border-red-400 text-red-500 py-2 rounded-lg"
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
  const [tables, setTables] = useState<TableItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);

  const [currentTableId, setCurrentTableId] = useState<string>("");

  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));

  const [showCreateTable, setShowCreateTable] = useState<boolean>(false);
  const [showAddAsset, setShowAddAsset] = useState<boolean>(false);

  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null);

  const currentTable: TableItem | undefined = tables.find(
    (t) => t.id === currentTableId
  );

  const days: DayItem[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        label: formatHeaderDate(date),
        weekday: ["月", "火", "水", "木", "金", "土", "日"][i],
        date,
      };
    });
  }, [weekStart]);

  const tableAssets: AssetItem[] = useMemo(() => {
    return [...assets]
      .filter((a) => a.tableId === currentTableId)
      .sort((a, b) => a.sort - b.sort);
  }, [assets, currentTableId]);

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
            onCreate={(table) => {
              setTables([table]);
              setCurrentTableId(table.id);
              setShowCreateTable(false);
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
          </div>

          <div className="flex items-center justify-between px-3 py-3 bg-gray-50 border-t">
            <button
              className="rounded-xl border bg-white px-4 py-2"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              type="button"
            >
              ←
            </button>

            <div className="font-semibold text-lg">{formatWeekTitle(weekStart)}</div>

            <button
              className="rounded-xl border bg-white px-4 py-2"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              type="button"
            >
              →
            </button>
          </div>
        </div>

        {tableAssets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center space-y-3">
            <p className="text-sm text-gray-600">このテーブルにはまだ資産がありません</p>
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
              <table className="border-collapse text-sm min-w-[760px] w-full">
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
                  {tableAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="border px-2 py-3 text-center align-middle whitespace-nowrap bg-white">
                        {asset.inspection}
                      </td>

                      <td className="sticky left-0 z-10 border px-2 py-3 text-center align-middle whitespace-pre-line bg-gray-50">
                        {asset.name}
                      </td>

                      {days.map((day) => {
                        const isSunday = day.date.getDay() === 0;
                        const isSaturday = day.date.getDay() === 6;

                        const cellBg = isSunday
                          ? "bg-red-50"
                          : isSaturday
                          ? "bg-blue-50"
                          : "bg-white";

                        const reservation = reservations.find(
                          (r) => r.assetId === asset.id && r.dayKey === day.key
                        );

                        return (
                          <td
                            key={`${asset.id}-${day.key}`}
                            className={`border p-1 align-top ${cellBg}`}
                          >
                            <button
                              className="w-full min-h-[64px] rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 active:scale-[0.99] text-left p-2"
                              onClick={() =>
                                setSelectedSlot({
                                  assetId: asset.id,
                                  assetName: asset.name,
                                  dayKey: day.key,
                                  dateLabel: `${day.label}（${day.weekday}）`,
                                })
                              }
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
                                  <span className="text-gray-400 text-xs">＋予約</span>
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
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          資産件数: {tableAssets.length} / 予約件数: {reservations.length}
        </p>
      </div>

      {selectedSlot && (
        <ReservationModal
          slot={selectedSlot}
          existing={reservations.find(
            (r) =>
              r.assetId === selectedSlot.assetId &&
              r.dayKey === selectedSlot.dayKey
          )}
          onClose={() => setSelectedSlot(null)}
          onSave={({ userName, site, note }) => {
            if (!selectedSlot) return;

            setReservations((prev) => {
              const filtered = prev.filter(
                (r) =>
                  !(
                    r.assetId === selectedSlot.assetId &&
                    r.dayKey === selectedSlot.dayKey
                  )
              );

              return [
                ...filtered,
                {
                  id: makeId(),
                  assetId: selectedSlot.assetId,
                  dayKey: selectedSlot.dayKey,
                  userName,
                  site,
                  note,
                },
              ];
            });

            setSelectedSlot(null);
          }}
          onDelete={() => {
            if (!selectedSlot) return;

            setReservations((prev) =>
              prev.filter(
                (r) =>
                  !(
                    r.assetId === selectedSlot.assetId &&
                    r.dayKey === selectedSlot.dayKey
                  )
              )
            );

            setSelectedSlot(null);
          }}
        />
      )}

      {showCreateTable && (
        <CreateTableModal
          onClose={() => setShowCreateTable(false)}
          onCreate={(table) => {
            setTables((prev) => [...prev, table]);
            setCurrentTableId(table.id);
            setShowCreateTable(false);
          }}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          onClose={() => setShowAddAsset(false)}
          onAdd={(asset) => {
            setAssets((prev) => [...prev, asset]);
            setShowAddAsset(false);
          }}
          tableId={currentTableId}
        />
      )}
    </main>
  );
}