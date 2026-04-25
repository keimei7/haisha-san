"use client";
import { useEffect, useMemo, useState, } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, storage } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";


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
  subLabel?: string;
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
  uploadedBy: string;
  uploadedAt: string;
};
type DayItem = {
  key: string;
  label: string;
  weekday: string;
  date: Date;
};

type SelectedSlot = {
  assetId: string;
  assetName: string;
  dayKey: string;
  dateLabel: string;
  endDayKey: string;
} | null;

type UserDoc = {
  companyId?: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: "owner" | "admin" | "member";
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
function escapeCsv(value: string): string {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, content: string) {
  const bom = "\uFEFF"; // Excelで日本語が化けにくくなる
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function formatInspectionShort(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^\d{4}\//, "");
}
async function compressImage(file: File): Promise<File> {
  const img = document.createElement("img");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  img.src = dataUrl;

  await new Promise((resolve) => {
    img.onload = resolve;
  });

  // 最大サイズ制限（ここ調整ポイント）
  const MAX_WIDTH = 1280;
  const MAX_HEIGHT = 1280;

  let width = img.width;
  let height = img.height;

  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
    width = width * ratio;
    height = height * ratio;
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob(resolve as any, "image/jpeg", 0.7) // ←画質
  );

  return new File([blob!], file.name, { type: "image/jpeg" });
}
function CreateTableModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    labelMeta1: string;
    labelMeta2: string;
  }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [meta1, setMeta1] = useState("");
  const [meta2, setMeta2] = useState("");

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold">テーブル作成</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">テーブル名</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：トラック予約表、ドローン貸し出し"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">車検・点検等</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={meta1}
              onChange={(e) => setMeta1(e.target.value)}
              placeholder="例：車検"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">アセット名</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={meta2}
              onChange={(e) => setMeta2(e.target.value)}
              placeholder="例：車種"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2"
            type="button"
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
          >
            作成
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            type="button"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTableModal({
  table,
  onClose,
  onSave,
  onDelete,
}: {
  table: TableItem;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    labelMeta1: string;
    labelMeta2: string;
  }) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(table.title);
  const [meta1, setMeta1] = useState(table.labelMeta1);
  const [meta2, setMeta2] = useState(table.labelMeta2);

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold">テーブル編集</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">テーブル名</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">車検・点検等</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={meta1}
              onChange={(e) => setMeta1(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">アセット名</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={meta2}
              onChange={(e) => setMeta2(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2"
            type="button"
            onClick={() => {
              if (!title.trim()) {
                alert("テーブル名を入れてください");
                return;
              }
              onSave({
                title: title.trim(),
                labelMeta1: meta1.trim() || "車検",
                labelMeta2: meta2.trim() || "車種",
              });
            }}
          >
            保存
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            type="button"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>

        <button
          className="w-full rounded-lg border border-red-400 text-red-500 py-2"
          type="button"
          onClick={onDelete}
        >
          このテーブルを削除
        </button>
      </div>
    </div>
  );
}

function AddAssetModal({
  onClose,
  onAdd,
  tableId,
  memberOptions,
}: {
  onClose: () => void;
  onAdd: (payload: {
    name: string;
    subLabel: string;
    inspection: string;
    tableId: string;
    assignedUser?: string;
  }) => void | Promise<void>;
  tableId: string;
  memberOptions: string[];
}) {
  const [name, setName] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [inspection, setInspection] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold">アセット追加</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">名前</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：ダンプ"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">ナンバー / 型番</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={subLabel}
              onChange={(e) => setSubLabel(e.target.value)}
              placeholder="例：12-34/ AB123C"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">割り当て</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
            >
              <option value="">共有</option>
              {memberOptions.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">点検・車検</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={inspection}
              onChange={(e) => setInspection(e.target.value)}
              placeholder="例：2026/01/01"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2"
            type="button"
            onClick={() => {
              if (!name.trim()) {
                alert("名前を入れてください");
                return;
              }

              onAdd({
                name: name.trim(),
                subLabel: subLabel.trim(),
                inspection: inspection.trim(),
                tableId,
                assignedUser: assignedUser || undefined,
              });
            }}
          >
            追加
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            type="button"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
function AssetEditModal({
  asset,
  memberOptions,
  onClose,
  onSave,
  onDelete,
}: {
  asset: AssetItem;
  memberOptions: string[];
  onClose: () => void;
  onSave: (payload: {
    name: string;
    subLabel: string;
    inspection: string;
    assignedUser?: string;
  }) => void | Promise<void>;
  onDelete: () => void | Promise<void>;

}) {
  const [name, setName] = useState(asset.name);
  const [inspection, setInspection] = useState(asset.inspection);
  const [assignedUser, setAssignedUser] = useState(asset.assignedUser ?? "");
const [subLabel, setSubLabel] = useState(asset.subLabel ?? "");
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold">アセット編集</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">名前</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
<div>
  <label className="text-sm text-gray-600">ナンバー / 型番</label>
  <input
    className="w-full border rounded-lg px-3 py-2"
    value={subLabel}
    onChange={(e) => setSubLabel(e.target.value)}
  />
</div>
          <div>
            <label className="text-sm text-gray-600">割り当て</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
            >
              <option value="">共有</option>
              {memberOptions.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">点検・車検</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={inspection}
              onChange={(e) => setInspection(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2"
            type="button"
            onClick={() => {
              if (!name.trim()) {
                alert("名前を入れてください");
                return;
              }
           onSave({
  name: name.trim(),
  subLabel: subLabel.trim(),
  inspection: inspection.trim(),
  assignedUser: assignedUser || undefined,
});
            }}
          >
            保存
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            type="button"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>

        <button
          className="w-full rounded-lg border border-red-400 text-red-500 py-2"
          type="button"
          onClick={onDelete}
        >
          このアセットを削除
        </button>
      </div>
    </div>
  );
}function ReservationModal({
  slot,
  existing,
  memberOptions,
  days,
  onClose,
  onSave,
  onDelete,
}: {
  slot: NonNullable<SelectedSlot>;
  existing?: ReservationItem;
  memberOptions: string[];
  days: DayItem[];
  onClose: () => void;
  onSave: (payload: {
    userName: string;
    site: string;
    note: string;
    endDayKey: string;
  }) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [userName, setUserName] = useState(existing?.userName ?? "");
  const [site, setSite] = useState(existing?.site ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [endDayKey, setEndDayKey] = useState(slot.endDayKey);

  const startIndex = days.findIndex((d) => d.key === slot.dayKey);
  const selectableDays = startIndex >= 0 ? days.slice(startIndex) : days;

  const selectedEndDay = selectableDays.find((d) => d.key === endDayKey);
  const durationDays =
    startIndex >= 0
      ? Math.max(
          1,
          days.findIndex((d) => d.key === endDayKey) - startIndex + 1
        )
      : 1;

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">予約入力</h2>
            <p className="text-sm text-gray-500">
              {slot.assetName}
              <br />
              開始日: {slot.dateLabel}
            </p>
          </div>

          <button
            className="text-2xl leading-none text-gray-500"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">予約者名</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
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
          </div>

          <div>
            <label className="text-sm text-gray-600">終了日</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={endDayKey}
              onChange={(e) => setEndDayKey(e.target.value)}
            >
              {selectableDays.map((day) => (
                <option key={day.key} value={day.key}>
                  {day.label}（{day.weekday}）
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
              {selectedEndDay
              ? `${selectedEndDay.label}（${selectedEndDay.weekday}）まで / ${durationDays}日予約`
: `${durationDays}日予約`
                }
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">行先</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="例：現場"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">用途・備考</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：搬入"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 text-white py-2"
            type="button"
            onClick={() => {
              if (!userName.trim()) {
                alert("予約者を選択してください");
                return;
              }

              onSave({
                userName: userName.trim(),
                site: site.trim(),
                note: note.trim(),
                endDayKey,
              });
            }}
          >
            決定
          </button>

          <button
            className="rounded-lg border px-4 py-2"
            type="button"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>

        <button
          className="w-full rounded-lg border border-red-400 text-red-500 py-2"
          type="button"
          onClick={onDelete}
        >
          この予約を削除
        </button>
      </div>
    </div>
  );
}
function PhotoSlotManagerModal({
  slots,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: {
  slots: PhotoSlotItem[];
  onClose: () => void;
  onAdd: (payload: { title: string; groupLabel: string }) => void | Promise<void>;
  onUpdate: (
    slotId: string,
    payload: { title: string; groupLabel: string }
  ) => void | Promise<void>;
  onDelete: (slotId: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [groupLabel, setGroupLabel] = useState("");

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold">チェック項目管理</h2>

        <div className="space-y-3 rounded-xl border p-3">
          <div>
            <label className="text-sm text-gray-600">表示グループ</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={groupLabel}
              onChange={(e) => setGroupLabel(e.target.value)}
              placeholder="例：朝 / 夕 / 返却時"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">写真枠の名前</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：酒気帯び確認 / 勤怠写真"
            />
          </div>

          <button
            className="w-full rounded-lg bg-blue-600 text-white py-2"
            type="button"
            onClick={async () => {
              if (!title.trim()) {
                alert("写真枠の名前を入れてください");
                return;
              }

              await onAdd({
                title: title.trim(),
                groupLabel: groupLabel.trim(),
              });

              setTitle("");
              setGroupLabel("");
            }}
          >
            ＋ 写真枠を追加
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-bold">登録済み</div>

          {slots.length === 0 ? (
            <div className="text-sm text-gray-400">写真枠なし</div>
          ) : (
            slots.map((slot) => (
              <PhotoSlotEditRow
                key={slot.id}
                slot={slot}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        <button
          className="w-full rounded-lg border px-4 py-2"
          type="button"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function PhotoSlotEditRow({
  slot,
  onUpdate,
  onDelete,
}: {
  slot: PhotoSlotItem;
  onUpdate: (
    slotId: string,
    payload: { title: string; groupLabel: string }
  ) => void | Promise<void>;
  onDelete: (slotId: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(slot.title);
  const [groupLabel, setGroupLabel] = useState(slot.groupLabel);

  return (
    <div className="rounded-xl border p-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="border rounded-lg px-2 py-1.5 text-sm"
          value={groupLabel}
          onChange={(e) => setGroupLabel(e.target.value)}
          placeholder="朝"
        />

        <input
          className="border rounded-lg px-2 py-1.5 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="酒気帯び確認"
        />
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg border py-1.5 text-sm"
          type="button"
          onClick={() =>
            onUpdate(slot.id, {
              title: title.trim(),
              groupLabel: groupLabel.trim(),
            })
          }
        >
          保存
        </button>

        <button
          className="rounded-lg border border-red-400 text-red-500 px-3 py-1.5 text-sm"
          type="button"
          onClick={() => onDelete(slot.id)}
        >
          削除
        </button>
      </div>
    </div>
  );
}
function PhotoLogListModal({
  assets,
  slots,
  logs,
  todayKey,
  onClose,
  onUpload,
}: {
  assets: AssetItem[];
  slots: PhotoSlotItem[];
  logs: PhotoLogItem[];
  todayKey: string;
  onClose: () => void;
  onUpload: (asset: AssetItem, slot: PhotoSlotItem, file: File) => Promise<void>;
}) {
  const assignedAssets = assets
    .filter((asset) => !!asset.assignedUser)
    .sort((a, b) => (a.assignedUser ?? "").localeCompare(b.assignedUser ?? ""));

  return (
    <div className="fixed inset-0 z-[220] bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">本日の写真一覧</h2>
            <div className="text-xs text-gray-500">{todayKey}</div>
          </div>

          <button
            className="text-2xl leading-none text-gray-500"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {assignedAssets.length === 0 ? (
          <div className="text-sm text-gray-400">割り当て済みアセットなし</div>
        ) : (
          <div className="space-y-3">
            {assignedAssets.map((asset) => {
              const targetSlots = slots.filter(
  (slot) => !slot.tableId || slot.tableId === asset.tableId
);
const submittedCount = targetSlots.filter((slot) =>                logs.some(
                  (log) =>
                    log.assetId === asset.id &&
                    log.slotId === slot.id &&
                    log.dateKey === todayKey
                )
              ).length;

              return (
                <div key={asset.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">{asset.assignedUser}</div>
                      <div className="text-sm text-gray-600">
                        {asset.name}
                        {asset.subLabel ? ` / ${asset.subLabel}` : ""}
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-2 py-1 text-xs ${
                        submittedCount === targetSlots.length && targetSlots.length > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                     {submittedCount}/{targetSlots.length}
                    </div>
                  </div>

                 <div className="overflow-x-auto">
  <div className="flex gap-2 min-w-max pb-1">
   {targetSlots.map((slot) => {
  const log = logs.find(
    (item) =>
      item.assetId === asset.id &&
      item.slotId === slot.id &&
      item.dateKey === todayKey
  );

  return (
    <div
      key={slot.id}
      className="w-[92px] shrink-0 rounded-xl border bg-white p-2"
    >
      <div className="h-8 text-[10px] font-bold leading-tight overflow-hidden">
        {slot.groupLabel ? `${slot.groupLabel} / ${slot.title}` : slot.title}
      </div>

      {/* サムネ（タップで撮影/選択） */}
      <div className="mt-1 h-[68px] w-[68px] overflow-hidden rounded-lg border bg-gray-100">
        {log?.photoUrl ? (
          <img
            src={log.photoUrl}
            alt={slot.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[11px] text-red-500 bg-white border border-dashed border-red-400 rounded-lg">
            未提出
          </div>
        )}
      </div>

      {/* 2ボタン */}
      <div className="mt-1 grid grid-cols-2 gap-1">
        {/* 撮影 */}
        <label className="cursor-pointer rounded-md border bg-white py-1 text-[10px] text-center">
          撮影
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const compressed = await compressImage(file);
              await onUpload(asset, slot, compressed);

              e.currentTarget.value = "";
            }}
          />
        </label>

        {/* 選択 */}
        <label className="cursor-pointer rounded-md border bg-white py-1 text-[10px] text-center">
          選択
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const compressed = await compressImage(file);
              await onUpload(asset, slot, compressed);

              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
})}
  </div>
</div>
                </div>
              );
            })}
          </div>
        )}

        <button
          className="w-full rounded-lg border px-4 py-2"
          type="button"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function ReservePage() {
    const [menuMyAssetsOpen, setMenuMyAssetsOpen] = useState(true);
const [openTableIds, setOpenTableIds] = useState<string[]>([]);
    const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
 
const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
 const [companyId, setCompanyId] = useState("");
const [myRole, setMyRole] = useState<"owner" | "admin" | "member">("member");
const [authLoading, setAuthLoading] = useState(true);
const [myDisplayName, setMyDisplayName] = useState("");

  const [tables, setTables] = useState<TableItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [memberOptions, setMemberOptions] = useState<string[]>([]);

  const [currentTableId, setCurrentTableId] = useState("");
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  const [companyName, setCompanyName] = useState("");

const [isEditingName, setIsEditingName] = useState(false);
const [editingDisplayName, setEditingDisplayName] = useState("");
const [savingDisplayName, setSavingDisplayName] = useState(false);

  const [showCreateTable, setShowCreateTable] = useState(false);
  const [showEditTable, setShowEditTable] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>(null);
const [showPhotoSlotManager, setShowPhotoSlotManager] = useState(false);
const [photoSlots, setPhotoSlots] = useState<PhotoSlotItem[]>([]);
const [photoLogs, setPhotoLogs] = useState<PhotoLogItem[]>([]);
const [showPhotoLogList, setShowPhotoLogList] = useState(false);

useEffect(() => {
  if (!companyId) return;

  const unsub = onSnapshot(doc(db, "companies", companyId), (snap) => {
    if (!snap.exists()) {
      setCompanyName("");
      return;
    }

    const data = snap.data() as { name?: string };
    setCompanyName(data.name ?? "");
  });

  return () => unsub();
}, [companyId]);
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        setAuthLoading(false);
        router.replace("/login");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setAuthLoading(false);
        router.replace("/setup");
        return;
      }

      const data = userSnap.data() as UserDoc;

      // 既存ユーザー救済:
      // Firestore側に email が無くて、Auth側に email があるなら自動補完
      if (!data.email && user.email) {
        await updateDoc(userRef, {
          email: user.email,
          updatedAt: new Date().toISOString(),
        });
      }

      setMyDisplayName(data.displayName ?? data.name ?? "");
      setMyRole(data.role ?? "member");

      if (!data.companyId) {
        setAuthLoading(false);
        router.replace("/setup");
        return;
      }

      setCompanyId(data.companyId);
      setAuthLoading(false);
    } catch (error) {
      console.error("auth/company read error:", error);
      setAuthLoading(false);
      router.replace("/login");
    }
  });

  return () => unsub();
}, [router]);

  useEffect(() => {
    if (!companyId) return;

   const q = query(collection(db, "users"), where("companyId", "==", companyId));
const unsub = onSnapshot(q, (snap) => {
  const names = snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as UserDoc & { isActive?: boolean };
      if (data.isActive === false) return "";
      return data.displayName ?? data.name ?? "";
    })
    .filter(Boolean);
  setMemberOptions(names);
});

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, "tables"), where("companyId", "==", companyId));
    const unsub = onSnapshot(q, (snap) => {
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
    });

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, "assets"), where("companyId", "==", companyId));
    const unsub = onSnapshot(q, (snap) => {
    const list: AssetItem[] = snap.docs.map((docSnap) => {
  const data = docSnap.data() as {
    name?: string;
    subLabel?: string;
    inspection?: string;
    tableId?: string;
    sort?: number;
    assignedUser?: string | null;
  };

  return {
    id: docSnap.id,
    name: data.name ?? "",
    subLabel: data.subLabel ?? "",
    inspection: data.inspection ?? "",
    tableId: data.tableId ?? "",
    sort: data.sort ?? 0,
    assignedUser: data.assignedUser ?? undefined,
  };
});

      setAssets(list);
    });

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "reservations"),
      where("companyId", "==", companyId)
    );
    const unsub = onSnapshot(q, (snap) => {
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
    });

    return () => unsub();
  }, [companyId]);

  useEffect(() => {
  if (!companyId) return;

  const q = query(
    collection(db, "photoSlots"),
    where("companyId", "==", companyId)
  );

  const unsub = onSnapshot(q, (snap) => {
    const list: PhotoSlotItem[] = snap.docs
      .map((docSnap) => {
       const data = docSnap.data() as {
  title?: string;
  groupLabel?: string;
  sort?: number;
  tableId?: string;
};

        return {
          id: docSnap.id,
          title: data.title ?? "",
          groupLabel: data.groupLabel ?? "",
          sort: data.sort ?? 0,
          tableId: data.tableId ?? "",
        };
      })
      .sort((a, b) => a.sort - b.sort);

    setPhotoSlots(list);
  });

  return () => unsub();
}, [companyId]);
useEffect(() => {
  if (!companyId) return;

  const q = query(
    collection(db, "photoLogs"),
    where("companyId", "==", companyId),
    where("dateKey", "==", makeDayKey(new Date()))
  );

  const unsub = onSnapshot(q, (snap) => {
    const list: PhotoLogItem[] = snap.docs.map((docSnap) => {
      const data = docSnap.data() as {
        assetId?: string;
        slotId?: string;
        dateKey?: string;
        photoUrl?: string;
        uploadedBy?: string;
        uploadedAt?: string;
      };

      return {
        id: docSnap.id,
        assetId: data.assetId ?? "",
        slotId: data.slotId ?? "",
        dateKey: data.dateKey ?? "",
        photoUrl: data.photoUrl ?? "",
        uploadedBy: data.uploadedBy ?? "",
        uploadedAt: data.uploadedAt ?? "",
      };
    });

    setPhotoLogs(list);
  });

  return () => unsub();
}, [companyId]);
  const currentTable = tables.find((t) => t.id === currentTableId);
const toggleTableOpen = (tableId: string) => {
  setOpenTableIds((prev) =>
    prev.includes(tableId)
      ? prev.filter((id) => id !== tableId)
      : [...prev, tableId]
  );
};
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
  return assets
    .filter((a) => !!a.assignedUser && a.assignedUser === myDisplayName)
    .sort((a, b) => a.sort - b.sort);
}, [assets, myDisplayName]);

const todayKey = makeDayKey(new Date());

const exportWeeklyReservationsCsv = () => {
  if (!currentTable) {
    alert("テーブルが選択されていません");
    return;
  }

  const header = [
    "アセット名",
    "ナンバー/型番",
    "点検・車検",
   ...days.map((day) => `${day.label}(${day.weekday})`),
  ];

  const rows = sharedAssets.map((asset) => {
    const dayCells = days.map((day) => {
      const reservation = reservations.find(
        (r) => r.assetId === asset.id && r.dayKey === day.key
      );

      if (!reservation) return "";

      return [
        reservation.site || "",
        reservation.userName || "",
        reservation.note || "",
      ]
        .filter(Boolean)
        .join(" / ");
    });

    return [
      asset.name,
      asset.subLabel ?? "",
      asset.inspection,
      ...dayCells,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");

 const filename = `${currentTable.title}_${formatWeekTitle(weekStart)}.csv`;
downloadCsv(filename, csv);
};
const uploadTodayPhoto = async (asset: AssetItem, slot: PhotoSlotItem, file: File) => {
  if (!companyId) return;

  const dateKey = makeDayKey(new Date());
  const logId = `${companyId}_${dateKey}_${asset.id}_${slot.id}`;
  const storagePath = `photoLogs/${companyId}/${dateKey}/${asset.id}/${slot.id}_${Date.now()}_${file.name}`;

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const photoUrl = await getDownloadURL(storageRef);

    await setDoc(doc(db, "photoLogs", logId), {
      companyId,
      assetId: asset.id,
      assetName: asset.name,
      slotId: slot.id,
      slotTitle: slot.title,
      groupLabel: slot.groupLabel,
      dateKey,
      photoUrl,
      uploadedBy: myDisplayName,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
 } catch (error) {
  console.error("photo upload error:", error);
  alert(
    error instanceof Error
      ? `写真アップロードに失敗しました: ${error.message}`
      : "写真アップロードに失敗しました"
  );
}
};

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("logout error:", error);
      alert("ログアウトに失敗しました");
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black p-3">
      <div className="mx-auto max-w-md">
        <div className="mb-3 rounded-2xl border overflow-hidden bg-white">
       <div className="h-24 flex items-center justify-center border-b bg-white relative">
  <img
    src="/icon.png"
    alt="gotab"
    className="h-14 w-auto"


  />

  <button
    className="absolute left-3 top-1/2 -translate-y-1/2 text-xl"
    onClick={() => setShowMenu(true)}
    type="button"
  >
    ☰
  </button>
</div>

          <div className="bg-green-300 border-b px-3 py-2.5 relative">
            <div className="text-center font-bold text-xl">
            {currentTable?.title ?? "テーブル未選択"}
            </div>


            {currentTable && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-black/20 bg-white px-3 py-1 text-sm"
                onClick={() => setShowEditTable(true)}
                type="button"
              >
                編集
              </button>

            )}
          </div>

          <div className="px-3 py-2 space-y-2 bg-white">
            {tables.length > 1 && (
  <div className="space-y-3">
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

    <div className="border-t border-dashed border-gray-300" />
  </div>
)}

           <div className="grid grid-cols-2 gap-1.5">
  <button className="rounded-lg border bg-white py-1.5 text-sm"
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
                ＋ アセット追加
              </button>
            </div>
          </div>

         <div className="px-3 py-3 bg-gray-50 border-t space-y-2">
  <div className="flex items-center justify-between">
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

  <button
    className="w-full rounded-xl border bg-white py-2 text-sm"
    type="button"
    onClick={exportWeeklyReservationsCsv}
  >
    この週をCSV出力
  </button>
</div>
        </div>

        {currentTableAssets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              このテーブルにはまだアセットがありません
            </p>
            <button
              onClick={() => setShowAddAsset(true)}
              className="rounded-xl border bg-white px-4 py-2 text-sm"
              type="button"
            >
              アセットを追加する
            </button>
          </div>
        ) : (
    <div className="rounded-xl border bg-white overflow-hidden">
  <div className="max-h-[70vh] overflow-auto">
    <table className="border-collapse text-sm min-w-[620px] w-full table-fixed">
      <thead>
        <tr>
          <th className="sticky top-0 z-30 border bg-red-100 text-red-700 px-2 py-2 w-[7%]">
  {currentTable?.labelMeta1 ?? "車検"}
</th>

          <th className="sticky top-0 left-0 z-40 border bg-green-100 text-green-700 px-2 py-2 w-[11%]">
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
  className={`sticky top-0 z-20 border px-2 py-2 min-w-[92px] ${headerBg}`}
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
            <td className="border px-2 py-3 text-center align-middle bg-white w-[7%]">
              {formatInspectionShort(asset.inspection)}
            </td>

            <td className="sticky left-0 z-20 border px-2 py-2 text-center align-middle bg-white w-[11%]">
              <button
                type="button"
                className="w-full text-center"
                onClick={() => setEditingAsset(asset)}
              >
                <div className="leading-tight">
                  <div className="text-[16px] font-medium break-words">
                    {asset.name}
                  </div>
                  {asset.subLabel && (
                    <div className="text-[12px] text-gray-600 mt-1 break-words">
                      {asset.subLabel}
                    </div>
                  )}
                </div>
              </button>
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
                    className="w-full min-h-[64px] rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 text-left p-2"
                    type="button"
                    onClick={() =>
                      setSelectedSlot({
                        assetId: asset.id,
                        assetName: asset.name,
                        dayKey: day.key,
                        dateLabel: `${day.label}（${day.weekday}）`,
                        endDayKey: day.key,
                      })
                    }
                  >
                    <div className="space-y-1">
                      {reservation ? (
                        <>
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
                        </>
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

  <div className="px-3 py-2 text-xs text-gray-500 border-t leading-5">
    予約日をタップすると終了日を選べます。同日なら1日、先の日付を選ぶと複数日予約になります。
  </div>
</div>
 )}

       {myAssets.length > 0 && (
  <div className="mt-4 rounded-2xl border bg-white p-4 space-y-3">
    <h3 className="font-bold">Myアセット</h3>

    <div className="space-y-3">
      {myAssets.map((asset) => (
  <div key={asset.id} className="rounded-xl border px-3 py-3 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <button
        type="button"
        className="min-w-0 text-left"
        onClick={() => setEditingAsset(asset)}
      >
        <div className="font-medium whitespace-pre-line break-words">
          {asset.name}
        </div>

        {asset.subLabel && (
          <div className="text-xs text-gray-500 mt-1 break-words">
            {asset.subLabel}
          </div>
        )}

        <div className="text-sm text-gray-500 mt-1">
          {asset.inspection || "点検情報なし"}
        </div>
      </button>

      <div className="text-sm text-gray-500 shrink-0">{asset.assignedUser}</div>
    </div>

    {photoSlots.length > 0 && (
      <div className="grid grid-cols-1 gap-2">
        {photoSlots
          .filter((slot) => !slot.tableId || slot.tableId === asset.tableId)
          .map((slot) => {
            const log = photoLogs.find(
              (l) =>
                l.assetId === asset.id &&
                l.slotId === slot.id &&
                l.dateKey === todayKey
            );

            return (
              <div
                key={slot.id}
                className="rounded-lg border bg-gray-50 p-2 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {slot.groupLabel
                      ? `${slot.groupLabel} / ${slot.title}`
                      : slot.title}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {log ? "本日提出済み" : "本日未提出"}
                  </div>

                  <label className="inline-block mt-1 rounded-lg border bg-white px-2 py-1 text-xs cursor-pointer">
                    {log ? "変更" : "＋写真"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const compressed = await compressImage(file);
                        await uploadTodayPhoto(asset, slot, compressed);

                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {log?.photoUrl ? (
                  <img
                    src={log.photoUrl}
                    alt={slot.title}
                    className="h-14 w-14 rounded-lg border object-cover shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg border border-dashed bg-white text-[10px] text-red-500 flex items-center justify-center shrink-0">
                    未
                  </div>
                )}
              </div>
            );
          })}
      </div>
    )}
  </div>
))}
    </div>
  </div>
)}

        <p className="mt-3 text-xs text-gray-500">
          アセット件数: {currentTableAssets.length} / 共有: {sharedAssets.length} /
          Myアセット: {myAssets.length} / 予約件数: {reservations.length}
        </p>
      </div>

      {showCreateTable && (
        <CreateTableModal
          onClose={() => setShowCreateTable(false)}
          onCreate={async ({ title, labelMeta1, labelMeta2 }) => {
            try {
              await addDoc(collection(db, "tables"), {
                companyId,
                title,
                labelMeta1,
                labelMeta2,
                sort: Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setShowCreateTable(false);
            } catch (error) {
              console.error("table create error:", error);
              alert("テーブル作成に失敗しました");
            }
          }}
        />
      )}

      {showEditTable && currentTable && (
        <EditTableModal
          table={currentTable}
          onClose={() => setShowEditTable(false)}
          onSave={async ({ title, labelMeta1, labelMeta2 }) => {
            try {
              await updateDoc(doc(db, "tables", currentTable.id), {
                title,
                labelMeta1,
                labelMeta2,
                updatedAt: new Date().toISOString(),
              });
              setShowEditTable(false);
            } catch (error) {
              console.error("table update error:", error);
              alert("テーブル更新に失敗しました");
            }
          }}
          onDelete={async () => {
            const ok = window.confirm("このテーブルを削除しますか？");
            if (!ok) return;

            try {
              const childAssets = assets.filter((asset) => asset.tableId === currentTable.id);

await Promise.all([
  ...childAssets.map((asset) => deleteDoc(doc(db, "assets", asset.id))),
  deleteDoc(doc(db, "tables", currentTable.id)),
]);

setShowEditTable(false);
            } catch (error) {
              console.error("table delete error:", error);
              alert("テーブル削除に失敗しました");
            }
          }}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          tableId={currentTableId}
          memberOptions={memberOptions}
          onClose={() => setShowAddAsset(false)}
        onAdd={async ({ name, subLabel, inspection, tableId, assignedUser }) => {
  try {
    await addDoc(collection(db, "assets"), {
      companyId,
      name,
      subLabel,
      inspection,
      tableId,
      assignedUser: assignedUser ?? null,
      sort: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowAddAsset(false);
  } catch (error) {
    console.error("asset add error:", error);
    alert("アセット追加に失敗しました");
  }
}}
        />
      )}

          {selectedSlot && (
  <ReservationModal
    slot={selectedSlot}
    existing={reservations.find(
      (r) =>
        r.assetId === selectedSlot.assetId &&
        r.dayKey === selectedSlot.dayKey
    )}
    memberOptions={memberOptions}
    days={days}
    onClose={() => setSelectedSlot(null)}
    onSave={async ({ userName, site, note, endDayKey }) => {
      try {
        const startIndex = days.findIndex((d) => d.key === selectedSlot.dayKey);
        const endIndex = days.findIndex((d) => d.key === endDayKey);

        if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
          alert("終了日の選択が不正です");
          return;
        }

        const targetDays = days.slice(startIndex, endIndex + 1);

        await Promise.all(
          targetDays.map((day) =>
            setDoc(
              doc(
                db,
                "reservations",
                makeReservationDocId(selectedSlot.assetId, day.key)
              ),
              {
                companyId,
                assetId: selectedSlot.assetId,
                dayKey: day.key,
                userName,
                site,
                note,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            )
          )
        );

        setSelectedSlot(null);
      } catch (error) {
        console.error("reservation save error:", error);
        alert("予約保存に失敗しました");
      }
    }}
    onDelete={async () => {
      try {
        await deleteDoc(
          doc(
            db,
            "reservations",
            makeReservationDocId(selectedSlot.assetId, selectedSlot.dayKey)
          )
        );
        setSelectedSlot(null);
      } catch (error) {
        console.error("reservation delete error:", error);
        alert("予約削除に失敗しました");
      }
    }}
  />
)}

    
{editingAsset && (
  <AssetEditModal
    asset={editingAsset}
    memberOptions={memberOptions}
    onClose={() => setEditingAsset(null)}
    onSave={async ({ name, subLabel, inspection, assignedUser }) => {
      try {
        await updateDoc(doc(db, "assets", editingAsset.id), {
          name,
          subLabel,
          inspection,
          assignedUser: assignedUser ?? null,
          updatedAt: new Date().toISOString(),
        });
        setEditingAsset(null);
      } catch (error) {
        console.error("asset update error:", error);
        alert("アセット更新に失敗しました");
      }
    }}
    onDelete={async () => {
      const ok = window.confirm("このアセットを削除しますか？");
      if (!ok) return;

      try {
        await deleteDoc(doc(db, "assets", editingAsset.id));
        setEditingAsset(null);
      } catch (error) {
        console.error("asset delete error:", error);
        alert("アセット削除に失敗しました");
      }
    }}
  />
)}
{showPhotoSlotManager && (
  <PhotoSlotManagerModal
    slots={photoSlots}
    onClose={() => setShowPhotoSlotManager(false)}
    onAdd={async ({ title, groupLabel }) => {
      try {
        await addDoc(collection(db, "photoSlots"), {
          companyId,
          title,
          groupLabel,
          sort: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("photo slot add error:", error);
        alert("写真枠の追加に失敗しました");
      }
    }}
    onUpdate={async (slotId, { title, groupLabel }) => {
      try {
        await updateDoc(doc(db, "photoSlots", slotId), {
          title,
          groupLabel,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("photo slot update error:", error);
        alert("写真枠の更新に失敗しました");
      }
    }}
    onDelete={async (slotId) => {
      const ok = window.confirm("この写真枠を削除しますか？");
      if (!ok) return;

      try {
        await deleteDoc(doc(db, "photoSlots", slotId));
      } catch (error) {
        console.error("photo slot delete error:", error);
        alert("写真枠の削除に失敗しました");
      }
    }}
  />
)}

      {showMenu && (
        <div className="fixed inset-0 z-[300]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMenu(false)}
          />

          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="font-bold text-lg">メニュー</div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
              >
                ✕
              </button>
            </div>
            <div className="px-1 space-y-2">
  

  <div className="space-y-2">
  {companyName && (
    <div className="text-sm text-gray-500">
      {companyName}
    </div>
  )}

  {!isEditingName ? (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <div className="text-sm text-gray-600 truncate">
        {myDisplayName || "表示名未設定"}
      </div>

      {(myRole === "admin" || myRole === "owner") && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
          管理者
        </span>
      )}
    </div>

    <button
      type="button"
      className="text-xs border px-2 py-1 rounded bg-white"
      onClick={() => {
        setEditingDisplayName(myDisplayName);
        setIsEditingName(true);
      }}
    >
      編集
    </button>
  </div>
) : (
    <div className="space-y-2">
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        value={editingDisplayName}
        onChange={(e) => setEditingDisplayName(e.target.value)}
        placeholder="表示名"
      />

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-blue-600 text-white py-1.5 text-sm disabled:opacity-50"
          onClick={async () => {
            if (!editingDisplayName.trim()) {
              alert("表示名を入力してください");
              return;
            }

            try {
              setSavingDisplayName(true);

              await updateDoc(
                doc(db, "users", auth.currentUser!.uid),
                {
                  displayName: editingDisplayName.trim(),
                  updatedAt: new Date().toISOString(),
                }
              );

              setMyDisplayName(editingDisplayName.trim());
              setIsEditingName(false);
            } catch (e) {
              console.error(e);
              alert("更新失敗");
            } finally {
              setSavingDisplayName(false);
            }
          }}
          disabled={savingDisplayName}
        >
          保存
        </button>

        <button
          type="button"
          className="px-3 py-1.5 border rounded text-sm"
          onClick={() => setIsEditingName(false)}
        >
          キャンセル
        </button>
      </div>
    </div>
  )}
</div>
</div>
<div className="border rounded-xl overflow-hidden">
  <button
    type="button"
    className="w-full px-3 py-2 flex justify-between bg-gray-50"
    onClick={() => setMenuMyAssetsOpen((prev) => !prev)}
  >
    <span className="font-semibold">Myアセット</span>
    <span>{menuMyAssetsOpen ? "−" : "＋"}</span>
  </button>

  {menuMyAssetsOpen && (
    <div className="p-3 space-y-2">
      {myAssets.length > 0 ? (
        myAssets.map((asset) => (
          <div
            key={asset.id}
            className="border rounded-lg p-2 text-sm flex justify-between"
          >
           <div>
  <div className="font-medium">{asset.name}</div>
  {asset.subLabel && (
    <div className="text-xs text-gray-500">
      {asset.subLabel}
    </div>
  )}
  <div className="text-xs text-gray-500">
    {asset.inspection || "点検なし"}
  </div>
</div>

            <button
              type="button"
              className="text-xs border px-2 py-1 rounded"
              onClick={() => {
                setEditingAsset(asset);
                setShowMenu(false);
              }}
            >
              編集
            </button>
          </div>
        ))
      ) : (
        <div className="text-sm text-gray-400">
          Myアセットなし
        </div>
      )}
    </div>
  )}
</div>

<div className="border rounded-xl overflow-hidden">
  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
    <div className="font-semibold">テーブル一覧</div>

    <button
      type="button"
      className="text-xs px-3 py-1.5 border rounded-lg bg-white"
      onClick={() => {
        setShowCreateTable(true);
        setShowMenu(false);
      }}
    >
      新規
    </button>
  </div>

  <div className="divide-y">
    {tables.map((table) => {
      const isOpen = openTableIds.includes(table.id);

      return (
        <div key={table.id}>
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <button
              className="flex-1 text-left flex justify-between"
              onClick={() => toggleTableOpen(table.id)}
              type="button"
            >
              <span>{table.title}</span>
              <span>{isOpen ? "−" : "＋"}</span>
            </button>

            <button
              className="ml-2 text-xs border px-2 py-1 rounded"
              type="button"
              onClick={() => {
                setCurrentTableId(table.id);
                setShowAddAsset(true);
                setShowMenu(false);
              }}
            >
              追加
            </button>
          </div>

          {isOpen && (
            <div className="px-3 pb-3 space-y-2">
              {assets
                .filter((a) => a.tableId === table.id)
                .map((asset) => (
                  <div
                    key={asset.id}
                    className="border rounded-lg p-2 text-xs flex justify-between"
                  >
                    <div>
                      <div>{asset.name}</div>
                      <div className="text-gray-400">
                        {asset.assignedUser || "共有"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="border px-2 py-1 rounded"
                      onClick={() => {
                        setEditingAsset(asset);
                        setShowMenu(false);
                      }}
                    >
                      編集
                    </button>
                  </div>
                ))}

              {assets.filter((a) => a.tableId === table.id).length === 0 && (
                <div className="text-xs text-gray-400">
                  アセットなし
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>
<div className="border rounded-xl overflow-hidden">
  <button
    type="button"
    className="w-full px-3 py-3 bg-white flex items-center justify-center relative"
    onClick={() => {
      setShowPhotoSlotManager(true);
      setShowMenu(false);
    }}
  >
    <span className="font-semibold">チェック項目管理</span>
    <span className="absolute right-3 text-sm text-gray-500">＋</span>
  </button>
</div>
<div className="border rounded-xl overflow-hidden">
  <button
    type="button"
    className="w-full px-3 py-3 bg-white flex items-center justify-center relative"
    onClick={() => {
      router.push("/daily-photos");
      setShowMenu(false);
    }}
  >
    <span className="font-semibold">本日の写真一覧</span>
    <span className="absolute right-3 text-sm text-gray-500">確認</span>
  </button>
</div>
{(myRole === "admin" || myRole === "owner") && (
  <button
    type="button"
    className="w-full border rounded-lg py-2 mt-4"
   onClick={() => {
  router.push("/daily-photos");
  setShowMenu(false);
}}
  >
    会社管理
  </button>
)}
            <button
              type="button"
              className="w-full border rounded-lg py-2 mt-4"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </main>
  );
}