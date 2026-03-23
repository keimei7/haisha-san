"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

type DayItem = {
  key: string;
  label: string;
  weekday: string;
  date: Date;
};

type Vehicle = {
  id: string;
  inspection: string;
  name: string;
  sort: number;
  saltFrom?: string;
  saltTo?: string;
  saltLabel?: string;
};

type Reservation = {
  id: string;
  vehicleId: string;
  dayKey: string;
  name: string;
  site: string;
  projectNo: string;
  createdAt?: unknown;
};

const weekdayJa = ["月", "火", "水", "木", "金", "土", "日"];

const memberOptions = [
   "濱野 昌之",
  "永井 和明",
  "林 知光",
  "細野 正史",
  "吉田 英樹",
  "新木 康弘",
  "髙橋 光広",
  "加藤 健一",
  "菅野 雄史",
  "楯 健三",
  "星野 大志",
  "木村 陽介",
  "北野 武蔵",
  "設樂 啓明",
  "狩野 康弘",
  "狩野 清一",
  "鈴木 利和",
  "狩野 丈二",
  "喜多 榛奈雄",
  "齋藤 大地",
  "村山 孝",
  "北村 謙吉",
  "松村 賢",
  "篠原 聖貴",
  "金澤 富士男",
  "吉田 弘二",
  "細野 美雪",
  "石坂 彩乃",
   "深津 直樹",
  "清水 友介",
  "今井 祐子",
  "石田 和義",
  "田村 和江",
　　"松田 唯",
   "小笠原 寿子",
   "設樂 雅之",
   "設樂 美佐子",
  "本多 竹三郎",
  "本多 八男",
  "宮内 弘",
  "車検",
  "修理",
];

function formatHeaderDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatWeekTitle(startDate: Date) {
  return `${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()} 週`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function makeReservationId(vehicleId: string, dayKey: string) {
  return `${vehicleId}_${dayKey}`;
}
function formatCsvDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function escapeCsv(value: string | number | undefined | null) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\r\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseYmd(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return toDateOnly(d);
}

function isSaltPeriod(vehicle: Vehicle, date: Date) {
  const from = parseYmd(vehicle.saltFrom);
  const to = parseYmd(vehicle.saltTo);
  if (!from || !to) return false;

  const current = toDateOnly(date);
  return current >= from && current <= to;
}

export default function Home() {
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [showVehicleLog, setShowVehicleLog] = useState(false);
  const [logMode, setLogMode] = useState<"vehicle" | "name" | "project">("vehicle");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const [siteHistory, setSiteHistory] = useState<string[]>([]);
  const [showSiteSuggest, setShowSiteSuggest] = useState(false);
  const [projectHistory, setProjectHistory] = useState<string[]>([]);
  const [showProjectSuggest, setShowProjectSuggest] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<{
    vehicleId: string;
    vehicleName: string;
    dayKey: string;
    dateLabel: string;
  } | null>(null);

  const [inspectionEdit, setInspectionEdit] = useState<{
    vehicleId: string;
    vehicleName: string;
    value: string;
  } | null>(null);

  const [formName, setFormName] = useState("");
  const [formSite, setFormSite] = useState("");
  const [formProjectNo, setFormProjectNo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("userName");
    if (saved) {
      setFormName(saved);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectNo = params.get("projectNo");
    const site = params.get("site");
    const name = params.get("name");

    if (projectNo) {
      setFormProjectNo(projectNo);
    }
    if (site) {
      setFormSite(site);
    }
    if (name) {
      setFormName(name);
      localStorage.setItem("userName", name);
    }
  }, []);

  const days = useMemo<DayItem[]>(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        label: formatHeaderDate(date),
        weekday: weekdayJa[i],
        date,
      };
    });
  }, [weekStart]);

  useEffect(() => {
    const q = query(collection(db, "vehicles"), orderBy("sort", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Vehicle[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            inspection?: string;
            name?: string;
            sort?: number;
            saltFrom?: string;
            saltTo?: string;
            saltLabel?: string;
          };

          return {
            id: docSnap.id,
            inspection: data.inspection ?? "",
            name: data.name ?? "",
            sort: data.sort ?? 0,
            saltFrom: data.saltFrom ?? "",
            saltTo: data.saltTo ?? "",
            saltLabel: data.saltLabel ?? "塩カル",
          };
        });

        setVehicles(list);
      },
      (error) => {
        console.error("vehicles read error:", error);
        alert("車両データの読み込みに失敗しました");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = collection(db, "reservations");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Reservation[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            vehicleId?: string;
            dayKey?: string;
            name?: string;
            site?: string;
            projectNo?: string;
            createdAt?: unknown;
          };

          return {
            id: docSnap.id,
            vehicleId: data.vehicleId ?? "",
            dayKey: data.dayKey ?? "",
            name: data.name ?? "",
            site: data.site ?? "",
            projectNo: data.projectNo ?? "",
            createdAt: data.createdAt,
          };
        });

        setReservations(list);
      },
      (error) => {
        console.error("reservations read error:", error);
        alert("予約データの読み込みに失敗しました");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!reservations.length) return;

    const projects = Array.from(
      new Set(
        reservations
          .map((r) => r.projectNo?.trim())
          .filter((p): p is string => !!p)
      )
    );

    const sites = Array.from(
      new Set(
        reservations
          .map((r) => r.site?.trim())
          .filter((s): s is string => !!s)
      )
    );

    setProjectHistory(projects);
    setSiteHistory(sites);
  }, [reservations]);

  const openReservationModal = (
    vehicleId: string,
    vehicleName: string,
    dayKey: string,
    dateLabel: string
  ) => {
    const existing = reservations.find(
      (r) => r.vehicleId === vehicleId && r.dayKey === dayKey
    );

    const params = new URLSearchParams(window.location.search);
    const presetName = params.get("name") ?? localStorage.getItem("userName") ?? "";
    const presetSite = params.get("site") ?? "";
    const presetProjectNo = params.get("projectNo") ?? "";

    setSelectedSlot({ vehicleId, vehicleName, dayKey, dateLabel });
    setFormName(existing?.name ?? presetName);
    setFormSite(existing?.site ?? presetSite);
    setFormProjectNo(existing?.projectNo ?? presetProjectNo);
  };

  const closeReservationModal = () => {
    setSelectedSlot(null);
    setFormName(localStorage.getItem("userName") ?? "");
    setFormSite("");
    setFormProjectNo("");
    setShowSiteSuggest(false);
    setShowProjectSuggest(false);
    setSaving(false);
  };

  const saveReservation = async () => {
    if (!selectedSlot) return;

    const trimmedName = formName.trim();
    const trimmedSite = formSite.trim();
    const trimmedProjectNo = formProjectNo.trim();

    if (!trimmedName) {
      alert("予約者名を選んでください");
      return;
    }

    const reservationId = makeReservationId(
      selectedSlot.vehicleId,
      selectedSlot.dayKey
    );

    try {
      setSaving(true);

      await setDoc(doc(db, "reservations", reservationId), {
        vehicleId: selectedSlot.vehicleId,
        dayKey: selectedSlot.dayKey,
        name: trimmedName,
        site: trimmedSite,
        projectNo: trimmedProjectNo,
        updatedAt: new Date().toISOString(),
      });

      closeReservationModal();
    } catch (error) {
      console.error("reservation save error:", error);
      alert("予約の保存に失敗しました");
      setSaving(false);
    }
  };
const exportCurrentWeekCsv = (
  mode: "all" | "reservedOnly" | "projectOnly"
) => {
  const rows: string[][] = [];

  rows.push([
    "日付",
    "曜日",
    "車種",
    "車検",
    "予約者名",
    "行先",
    "工事番号",
  ]);

  for (const day of days) {
    for (const vehicle of vehicles) {
      const reservation = reservations.find(
        (r) => r.vehicleId === vehicle.id && r.dayKey === day.key
      );

      if (mode === "reservedOnly" && !reservation) continue;
      if (mode === "projectOnly" && !reservation?.projectNo?.trim()) continue;

      rows.push([
        formatCsvDate(day.date),
        day.weekday,
        vehicle.name,
        vehicle.inspection,
        reservation?.name ?? "",
        reservation?.site ?? "",
        reservation?.projectNo ?? "",
      ]);
    }
  }

  const weekLabel = formatCsvDate(weekStart).replace(/\//g, "-");

  const fileName =
    mode === "all"
      ? `配車さん_${weekLabel}_週_全件.csv`
      : mode === "reservedOnly"
      ? `配車さん_${weekLabel}_週_予約ありのみ.csv`
      : `配車さん_${weekLabel}_週_工事番号ありのみ.csv`;

  downloadCsv(fileName, rows);
};
  const saveInspection = async () => {
    if (!inspectionEdit) return;

    try {
      await updateDoc(doc(db, "vehicles", inspectionEdit.vehicleId), {
        inspection: inspectionEdit.value.trim(),
      });
      setInspectionEdit(null);
    } catch (error) {
      console.error("inspection update error:", error);
      alert("車検日の保存に失敗しました");
    }
  };

  const filteredLogs = reservations
    .filter((r) => {
      if (logMode === "vehicle") {
        return selectedVehicleId ? r.vehicleId === selectedVehicleId : false;
      }
      if (logMode === "name") {
        return selectedName ? r.name === selectedName : false;
      }
      if (logMode === "project") {
        return selectedProject ? r.projectNo === selectedProject : false;
      }
      return false;
    })
    .sort((a, b) => (a.dayKey > b.dayKey ? 1 : -1));

  return (
    <main className="min-h-screen bg-white text-black p-3">
      <div className="mx-auto max-w-md">
        <div className="mb-3 rounded-xl border overflow-hidden">
          <div className="bg-white py-2 flex items-center justify-center gap-1 border-b">
            <img
              src="/icon.png"
              alt="配車さん"
              className="w-12 h-12 object-contain"
            />
            <div className="font-bold text-lg tracking-wide">配車さん</div>
          </div>

          <div className="bg-yellow-300 text-center font-bold py-2 text-lg">
            トラック配車シート
          </div>

          {formProjectNo && (
            <div className="mx-3 mt-2 rounded-lg border bg-blue-50 px-3 py-2 text-sm">
              <div className="font-semibold text-blue-800">
                📌 案件: {formProjectNo}
              </div>
              {formSite && <div className="text-blue-700">{formSite}</div>}
            </div>
          )}

         
  <button
  className="w-full border-b py-2 text-sm bg-white"
  onClick={() => router.push("/portal")}
>
  🏢 ポータルへ
</button>

<div className="p-2 space-y-2 border-b bg-white">
  <button
    className="w-full border rounded-lg py-2"
    onClick={() => setShowVehicleLog(true)}
  >
    車両実績を見る
  </button>

  <details className="rounded-lg border bg-white">
    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none flex items-center justify-between">
      <span>⬇️ CSV出力</span>
      <span className="text-gray-500">▼</span>
    </summary>

    <div className="border-t p-2 space-y-2">
      <button
        className="w-full rounded-lg border py-2 text-sm"
        onClick={() => exportCurrentWeekCsv("all")}
      >
        全件
      </button>

      <button
        className="w-full rounded-lg border py-2 text-sm"
        onClick={() => exportCurrentWeekCsv("reservedOnly")}
      >
        予約ありのみ
      </button>

      <button
        className="w-full rounded-lg border py-2 text-sm"
        onClick={() => exportCurrentWeekCsv("projectOnly")}
      >
        工事番号ありのみ
      </button>
    </div>
  </details>
</div>

          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t">
            <button
              className="rounded-lg border px-3 py-1"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              ←
            </button>

            <div className="font-semibold">{formatWeekTitle(weekStart)}</div>

            <button
              className="rounded-lg border px-3 py-1"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="border-collapse text-sm min-w-[760px] w-full">
            <thead>
              <tr>
                <th className="border bg-red-500 text-white px-2 py-2 w-16">
                  車検
                </th>
                <th className="border bg-green-600 text-white px-2 py-2 w-28">
                  車種
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
              {vehicles.map((vehicle) => {
                return (
                  <tr key={vehicle.id}>
                    <td className="border px-2 py-3 text-center align-middle whitespace-nowrap">
                      <button
                        className="underline decoration-dotted hover:text-blue-600"
                        onClick={() =>
                          setInspectionEdit({
                            vehicleId: vehicle.id,
                            vehicleName: vehicle.name.replace("\n", " "),
                            value: vehicle.inspection,
                          })
                        }
                      >
                        {vehicle.inspection}
                      </button>
                    </td>

                    <td className="border px-2 py-3 text-center align-middle whitespace-pre-line bg-gray-50">
                      {vehicle.name}
                    </td>

                    {days.map((day) => {
                      const isSunday = day.date.getDay() === 0;
                      const isSaturday = day.date.getDay() === 6;
                      const saltActive = isSaltPeriod(vehicle, day.date);

                      const cellBg = isSunday
                        ? "bg-red-50"
                        : isSaturday
                        ? "bg-blue-50"
                        : "bg-white";

                      const reservation = reservations.find(
                        (r) => r.vehicleId === vehicle.id && r.dayKey === day.key
                      );

                      return (
                        <td
                          key={`${vehicle.id}-${day.key}`}
                          className={`border p-1 align-top ${cellBg}`}
                        >
                          <button
                            className="w-full min-h-[64px] rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 active:scale-[0.99] text-left p-2"
                            onClick={() =>
                              openReservationModal(
                                vehicle.id,
                                vehicle.name.replace("\n", " "),
                                day.key,
                                `${day.label}（${day.weekday}）`
                              )
                            }
                          >
                            <div className="space-y-1">
                              {saltActive && (
                                <div className="inline-block rounded bg-amber-100 px-2 py-[2px] text-[10px] font-semibold text-amber-800">
                                  {vehicle.saltLabel || "塩カル期間"}
                                </div>
                              )}

                              {reservation ? (
                                <div className="space-y-1">
                                  {reservation.site && (
                                    <div className="font-bold text-sm">
                                      {reservation.site}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-700">
                                    {reservation.name}
                                  </div>
                                  {reservation.projectNo && (
                                    <div className="text-xs text-gray-500">
                                      {reservation.projectNo}
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
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          vehicles件数: {vehicles.length} / reservations件数: {reservations.length}
        </p>
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">予約入力</h2>
                <p className="text-sm text-gray-500">
                  {selectedSlot.vehicleName}
                  <br />
                  {selectedSlot.dateLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReservationModal}
                className="text-2xl leading-none text-gray-500 hover:text-black px-2"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">予約者名</label>
                <select
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    localStorage.setItem("userName", e.target.value);
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">選択してください</option>
                  {memberOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="text-sm text-gray-600">行先</label>
                <input
                  type="text"
                  value={formSite}
                  onChange={(e) => {
                    setFormSite(e.target.value);
                    setShowSiteSuggest(true);
                  }}
                  onFocus={() => setShowSiteSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSiteSuggest(false), 200)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例：岩田金物 / 機材センター / 現場名"
                />

                {showSiteSuggest && siteHistory.length > 0 && (
                  <div className="absolute z-50 bg-white border rounded-lg mt-1 w-full shadow max-h-48 overflow-y-auto">
                    {siteHistory
                      .filter((s) => !formSite || s.includes(formSite))
                      .map((s) => (
                        <div
                          key={s}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setFormSite(s);
                            setShowSiteSuggest(false);
                          }}
                        >
                          {s}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="text-sm text-gray-600">工事番号（任意）</label>
                <input
                  type="text"
                  value={formProjectNo}
                  onChange={(e) => {
                    setFormProjectNo(e.target.value);
                    setShowProjectSuggest(true);
                  }}
                  onFocus={() => setShowProjectSuggest(true)}
                  onBlur={() => setTimeout(() => setShowProjectSuggest(false), 200)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="分かる場合のみ入力"
                />

                {showProjectSuggest && projectHistory.length > 0 && (
                  <div className="absolute z-50 bg-white border rounded-lg mt-1 w-full shadow max-h-48 overflow-y-auto">
                    {projectHistory
                      .filter((p) => !formProjectNo || p.includes(formProjectNo))
                      .map((p) => (
                        <div
                          key={p}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setFormProjectNo(p);
                            setShowProjectSuggest(false);
                          }}
                        >
                          {p}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
                onClick={saveReservation}
                disabled={saving}
              >
                決定
              </button>

              <button
                className="rounded-lg border px-4 py-2"
                onClick={closeReservationModal}
                disabled={saving}
              >
                閉じる
              </button>
            </div>

            <button
              className="w-full border border-red-400 text-red-500 py-2 rounded-lg disabled:opacity-50"
              onClick={async () => {
                if (!selectedSlot) return;

                const ok = window.confirm("本当に削除しますか？");
                if (!ok) return;

                const existing = reservations.find(
                  (r) =>
                    r.vehicleId === selectedSlot.vehicleId &&
                    r.dayKey === selectedSlot.dayKey
                );

                if (!existing) {
                  closeReservationModal();
                  return;
                }

                setSaving(true);

                try {
                  await deleteDoc(doc(db, "reservations", existing.id));
                  closeReservationModal();
                } catch (error) {
                  console.error("reservation delete error:", error);
                  alert("予約の削除に失敗しました");
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              この予約を削除
            </button>
          </div>
        </div>
      )}

      {inspectionEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl space-y-3">
            <div>
              <h2 className="text-lg font-bold">車検日変更</h2>
              <p className="text-sm text-gray-500">{inspectionEdit.vehicleName}</p>
            </div>

            <label className="block">
              <div className="mb-1 text-sm font-medium">車検日</div>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={inspectionEdit.value}
                onChange={(e) =>
                  setInspectionEdit({
                    ...inspectionEdit,
                    value: e.target.value,
                  })
                }
                placeholder="例：3/18 または 済"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium"
                onClick={saveInspection}
              >
                決定
              </button>

              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setInspectionEdit(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {showVehicleLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">車両実績</h2>
              <button onClick={() => setShowVehicleLog(false)}>×</button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLogMode("vehicle");
                  setSelectedVehicleId("");
                  setSelectedName("");
                  setSelectedProject("");
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  logMode === "vehicle" ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                車両
              </button>

              <button
                onClick={() => {
                  setLogMode("name");
                  setSelectedVehicleId("");
                  setSelectedName("");
                  setSelectedProject("");
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  logMode === "name" ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                社員
              </button>

              <button
                onClick={() => {
                  setLogMode("project");
                  setSelectedVehicleId("");
                  setSelectedName("");
                  setSelectedProject("");
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  logMode === "project" ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                工事番号
              </button>
            </div>

            {logMode === "vehicle" && (
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">車両を選択</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}

            {logMode === "name" && (
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">社員を選択</option>
                {memberOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            {logMode === "project" && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">工事番号を選択</option>
                {projectHistory.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}

            <div className="space-y-2">
              {filteredLogs.map((r) => {
                const vehicleName =
                  vehicles.find((v) => v.id === r.vehicleId)?.name ?? "";

                return (
                  <div key={r.id} className="border rounded-lg p-2 text-sm">
                    <div className="font-bold">{r.dayKey}</div>
                    {r.site && <div className="text-gray-800">{r.site}</div>}
                    <div>{r.name}</div>
                    {vehicleName && (
                      <div className="text-gray-700">{vehicleName}</div>
                    )}
                    {r.projectNo && (
                      <div className="text-gray-400">{r.projectNo}</div>
                    )}
                  </div>
                );
              })}

              {((logMode === "vehicle" && !selectedVehicleId) ||
                (logMode === "name" && !selectedName) ||
                (logMode === "project" && !selectedProject)) && (
                <div className="text-sm text-gray-500 text-center py-6">
                  条件を選択してください
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}