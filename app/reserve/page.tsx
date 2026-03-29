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
};

type ReservationItem = {
  id: string;
  assetId: string;
  dayKey: string;
  name: string;
};

type DayItem = {
  key: string;
  label: string;
  weekday: string;
};

type SelectedSlot = {
  assetId: string;
  dayKey: string;
} | null;

type CreateTableModalProps = {
  onClose: () => void;
  onCreate: (table: TableItem) => void;
};

type AddAssetModalProps = {
  onClose: () => void;
  onAdd: (asset: AssetItem) => void;
  tableId: string;
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

function CreateTableModal({
  onClose,
  onCreate,
}: CreateTableModalProps) {
  const [title, setTitle] = useState("");
  const [meta1, setMeta1] = useState("車検");
  const [meta2, setMeta2] = useState("車種");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3">
        <h2 className="text-lg font-bold">テーブル作成</h2>

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="テーブル名"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="左ラベル1"
          value={meta1}
          onChange={(e) => setMeta1(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="左ラベル2"
          value={meta2}
          onChange={(e) => setMeta2(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="flex-1 border rounded px-3 py-2"
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
            className="px-3 py-2 border rounded"
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3">
        <h2 className="text-lg font-bold">資産追加</h2>

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="車検・点検"
          value={inspection}
          onChange={(e) => setInspection(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="flex-1 border rounded px-3 py-2"
            onClick={() => {
              if (!name.trim()) return;
              onAdd({
                id: makeId(),
                name: name.trim(),
                inspection: inspection.trim(),
                tableId,
              });
            }}
            type="button"
          >
            追加
          </button>

          <button
            className="px-3 py-2 border rounded"
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

export default function ReservePage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);

  const [currentTableId, setCurrentTableId] = useState<string>("");

  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));

  const [showCreateTable, setShowCreateTable] = useState<boolean>(false);
  const [showAddAsset, setShowAddAsset] = useState<boolean>(false);

  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null);
  const [formName, setFormName] = useState<string>("");

  const currentTable: TableItem | undefined = tables.find(
    (t) => t.id === currentTableId
  );

  const days: DayItem[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        weekday: ["月", "火", "水", "木", "金", "土", "日"][i],
      };
    });
  }, [weekStart]);

  const tableAssets: AssetItem[] = useMemo(() => {
    return assets.filter((a) => a.tableId === currentTableId);
  }, [assets, currentTableId]);

  if (tables.length === 0) {
    return (
      <main className="p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">AssetTableを作成</h1>

        <button
          onClick={() => setShowCreateTable(true)}
          className="px-4 py-2 border rounded"
          type="button"
        >
          テーブルを作る
        </button>

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

  if (tableAssets.length === 0) {
    return (
      <main className="p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">
          {currentTable?.title ?? "AssetTable"}
        </h1>

        <p>資産がまだありません</p>

        <button
          onClick={() => setShowAddAsset(true)}
          className="px-4 py-2 border rounded"
          type="button"
        >
          資産を追加
        </button>

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

  return (
    <main className="p-3 space-y-3">
      <div className="flex justify-between items-center">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} type="button">
          ←
        </button>
        <div className="font-bold">{currentTable?.title}</div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} type="button">
          →
        </button>
      </div>

      <div className="flex gap-2">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => setCurrentTableId(table.id)}
            className={`px-3 py-1 border rounded ${
              table.id === currentTableId ? "font-bold" : ""
            }`}
            type="button"
          >
            {table.title}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowAddAsset(true)}
          className="border px-3 py-1 rounded"
          type="button"
        >
          ＋資産追加
        </button>

        <button
          onClick={() => setShowCreateTable(true)}
          className="border px-3 py-1 rounded"
          type="button"
        >
          ＋テーブル追加
        </button>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-2">{currentTable?.labelMeta1}</th>
            <th className="border px-2 py-2">{currentTable?.labelMeta2}</th>
            {days.map((d) => (
              <th key={d.key} className="border px-2 py-2">
                {d.label}
                <br />
                {d.weekday}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {tableAssets.map((asset) => (
            <tr key={asset.id}>
              <td className="border px-2 py-2">{asset.inspection}</td>
              <td className="border px-2 py-2">{asset.name}</td>

              {days.map((day) => {
                const reservation = reservations.find(
                  (x) => x.assetId === asset.id && x.dayKey === day.key
                );

                return (
                  <td key={day.key} className="border px-2 py-2">
                    <button
                      onClick={() =>
                        setSelectedSlot({
                          assetId: asset.id,
                          dayKey: day.key,
                        })
                      }
                      type="button"
                    >
                      {reservation ? reservation.name : "＋"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3">
            <h2 className="text-lg font-bold">予約入力</h2>

            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="名前"
              className="w-full border px-3 py-2 rounded"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!selectedSlot || !formName.trim()) return;

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
                        name: formName.trim(),
                      },
                    ];
                  });

                  setSelectedSlot(null);
                  setFormName("");
                }}
                className="flex-1 border rounded px-3 py-2"
                type="button"
              >
                保存
              </button>

              <button
                onClick={() => {
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
                  setFormName("");
                }}
                className="border rounded px-3 py-2"
                type="button"
              >
                削除
              </button>

              <button
                onClick={() => {
                  setSelectedSlot(null);
                  setFormName("");
                }}
                className="border rounded px-3 py-2"
                type="button"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
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