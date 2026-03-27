"use client";

export const dynamic = "force-dynamic";

import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

type DayItem = {
  key: string;
  label: string;
  weekday: string;
  date: Date;
};

type Vehicle = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  companyId?: string;
  assignedUid?: string;
  assignedTo?: string;
};

type Reservation = {
  id: string;
  vehicleId: string;
  dayKey: string;
  name?: string;
  userUid?: string;
  userName?: string;
  site: string;
  projectNo: string;
  companyId?: string;
  createdAt?: unknown;
  updatedAt?: string;
};

type UserDoc = {
  uid?: string;
  email?: string;
  displayName?: string;
  companyId?: string;
  role?: string;
  name?: string;
};

type MemberItem = {
  uid: string;
  name: string;
};

const weekdayJa = ["月", "火", "水", "木", "金", "土", "日"];

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

export default function ReservePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [uid, setUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [userRole, setUserRole] = useState("");

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState("");

  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [showVehicleLog, setShowVehicleLog] = useState(false);
  const [logMode, setLogMode] = useState<"vehicle" | "name">("vehicle");
const [selectedVehicleId, setSelectedVehicleId] = useState("");
const [selectedName, setSelectedName] = useState("");

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

  const [formSite, setFormSite] = useState("");
  const [formProjectNo, setFormProjectNo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUid(null);
        setUserName("");
        setCompanyId("");
        setUserRole("");
        return;
      }

      setUid(currentUser.uid);

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (!userSnap.exists()) {
          setUserName("");
          setCompanyId("");
          setUserRole("");
          return;
        }

        const data = userSnap.data() as UserDoc;
        const resolvedName = data.displayName ?? data.name ?? "";
        const resolvedCompanyId = data.companyId ?? "";
        const resolvedRole = data.role ?? "";

        setUserName(resolvedName);
        setCompanyId(resolvedCompanyId);
        setUserRole(resolvedRole);
        setSelectedUserUid(currentUser.uid);
      } catch (error) {
        console.error("user read error:", error);
        setUserName("");
        setCompanyId("");
        setUserRole("");
      }
    });

    return () => unsubscribe();
  }, [mounted]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, "users"), where("companyId", "==", companyId));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: MemberItem[] = snap.docs
        .map((d) => {
          const data = d.data() as UserDoc;
          return {
            uid: d.id,
            name: data.displayName ?? data.name ?? "",
          };
        })
        .filter((m) => m.name);

      setMembers(list);

      if (!selectedUserUid && uid) {
        setSelectedUserUid(uid);
      }
    });

    return () => unsubscribe();
  }, [companyId, uid, selectedUserUid]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "vehicles"),
      where("companyId", "==", companyId),
      orderBy("sort", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Vehicle[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            inspection?: string;
            name?: string;
            sort?: number;
            companyId?: string;
            assignedUid?: string;
            assignedTo?: string;
          };

          return {
            id: docSnap.id,
            inspection: data.inspection ?? "",
            name: data.name ?? "",
            sort: data.sort ?? 0,
            companyId: data.companyId ?? "",
            assignedUid: data.assignedUid ?? "",
            assignedTo: data.assignedTo ?? "",
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
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, "reservations"), where("companyId", "==", companyId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Reservation[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            vehicleId?: string;
            dayKey?: string;
            name?: string;
            userUid?: string;
            userName?: string;
            site?: string;
            projectNo?: string;
            companyId?: string;
            createdAt?: unknown;
            updatedAt?: string;
          };

          return {
            id: docSnap.id,
            vehicleId: data.vehicleId ?? "",
            dayKey: data.dayKey ?? "",
            name: data.name ?? "",
            userUid: data.userUid ?? "",
            userName: data.userName ?? "",
            site: data.site ?? "",
            projectNo: data.projectNo ?? "",
            companyId: data.companyId ?? "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt ?? "",
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
  }, [companyId]);

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

  const sharedVehicles = useMemo(() => {
    return vehicles.filter(
      (v) => !(v.assignedUid ?? "").trim() && !(v.assignedTo ?? "").trim()
    );
  }, [vehicles]);

  const nameHistory = useMemo(() => {
    return Array.from(
      new Set(
        reservations
          .map((r) => (r.userName ?? r.name)?.trim())
          .filter((n): n is string => !!n)
      )
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [reservations]);

  const openReservationModal = (
    vehicleId: string,
    vehicleName: string,
    dayKey: string,
    dateLabel: string
  ) => {
    if (!uid || !userName.trim()) {
      alert("先にマイページで表示名を登録してください");
      router.push("/mypage");
      return;
    }

    const existing = reservations.find(
      (r) => r.vehicleId === vehicleId && r.dayKey === dayKey
    );

    setSelectedSlot({ vehicleId, vehicleName, dayKey, dateLabel });
    setSelectedUserUid(existing?.userUid ?? uid);
    setFormSite(existing?.site ?? "");
    setFormProjectNo(existing?.projectNo ?? "");
  };

  const closeReservationModal = () => {
    setSelectedSlot(null);
    setSelectedUserUid(uid ?? "");
    setFormSite("");
    setFormProjectNo("");
    setShowSiteSuggest(false);
    setShowProjectSuggest(false);
    setSaving(false);
  };

  const saveReservation = async () => {
    if (!selectedSlot) return;
    if (!companyId) {
      alert("会社情報が取得できませんでした");
      return;
    }

    const trimmedSite = formSite.trim();
    const trimmedProjectNo = formProjectNo.trim();

    const selectedUser = members.find((m) => m.uid === selectedUserUid);
    if (!selectedUserUid || !selectedUser) {
      alert("予約者を選択してください");
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
        userUid: selectedUserUid,
        userName: selectedUser.name,
        companyId,
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

 const exportCurrentWeekCsv = (mode: "all" | "reservedOnly") => {
    const rows: string[][] = [];

    rows.push([
      "日付",
      "曜日",
      "車種",
      "車検",
      "予約者名",
      "行先",
      "用途・案件番号",
    ]);

    for (const day of days) {
      for (const vehicle of sharedVehicles) {
        const reservation = reservations.find(
          (r) => r.vehicleId === vehicle.id && r.dayKey === day.key
        );

        if (mode === "reservedOnly" && !reservation) continue;
       
        rows.push([
          formatCsvDate(day.date),
          day.weekday,
          vehicle.name,
          vehicle.inspection,
          reservation?.userName ?? reservation?.name ?? "",
          reservation?.site ?? "",
          reservation?.projectNo ?? "",
        ]);
      }
    }

    const weekLabel = formatCsvDate(weekStart).replace(/\//g, "-");

    const fileName =
  mode === "all"
    ? `配車さん_${weekLabel}_週_全件.csv`
    : `配車さん_${weekLabel}_週_予約ありのみ.csv`;

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
      const displayName = r.userName ?? r.name ?? "";
      return selectedName ? displayName === selectedName : false;
    }
    return false;
  })
  .sort((a, b) => (a.dayKey > b.dayKey ? 1 : -1));

  if (!mounted) return null;

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
    共有車予約ページ
  </div>

  <div className="p-3 space-y-3 bg-white">
   

    <div className="grid grid-cols-2 gap-2">
      <button
        className="rounded-xl border bg-white py-2.5 text-sm"
        onClick={() => router.push("/mypage")}
        type="button"
      >
        ← マイページ
      </button>

      <button
        className="rounded-xl border bg-white py-2.5 text-sm"
        onClick={() => router.push("/manage")}
        type="button"
      >
        ⚙️ 管理ページ
      </button>
    </div>

    <button
      className="w-full rounded-xl border bg-white py-3 text-sm"
      onClick={() => setShowVehicleLog(true)}
      type="button"
    >
      車両実績を見る
    </button>

    <details className="rounded-xl border bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none flex items-center justify-between">
        <span>⬇️ CSV出力</span>
        <span className="text-gray-500">▼</span>
      </summary>

      <div className="border-t p-2 space-y-2">
        <button
          className="w-full rounded-lg border py-2 text-sm"
          onClick={() => exportCurrentWeekCsv("all")}
          type="button"
        >
          全件
        </button>

        <button
          className="w-full rounded-lg border py-2 text-sm"
          onClick={() => exportCurrentWeekCsv("reservedOnly")}
          type="button"
        >
          予約ありのみ
        </button>

      
      </div>
    </details>
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
             <div className="rounded-xl border overflow-hidden">
  <div className="overflow-auto max-h-[70vh]">
    <table className="border-collapse text-sm min-w-[760px] w-max">
      <thead>
        <tr>
          <th className="sticky top-0 left-0 z-30 border bg-red-500 text-white px-1 py-2 w-[40px] min-w-[40px] max-w-[40px] text-[11px]">
            車検
          </th>

          <th className="sticky top-0 left-[40px] z-30 border bg-green-600 text-white px-1 py-2 w-[48px] min-w-[48px] max-w-[48px] text-[11px]">
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
                className={`sticky top-0 z-20 border px-1 py-2 w-[84px] min-w-[84px] max-w-[84px] ${headerBg}`}
              >
                <div className="font-bold text-sm">{day.label}</div>
                <div className={`text-xs ${weekdayColor}`}>{day.weekday}</div>
              </th>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {sharedVehicles.map((vehicle) => (
          <tr key={vehicle.id}>
            <td className="sticky left-0 z-20 border px-1 py-3 text-center align-middle whitespace-nowrap bg-white w-[40px] min-w-[40px] max-w-[40px]">
              <button
                className="underline decoration-dotted hover:text-blue-600 text-[11px] leading-tight"
                onClick={() =>
                  setInspectionEdit({
                    vehicleId: vehicle.id,
                    vehicleName: vehicle.name.replace("\n", " "),
                    value: vehicle.inspection,
                  })
                }
                type="button"
              >
                {vehicle.inspection}
              </button>
            </td>

            <td className="sticky left-[40px] z-20 border px-1 py-3 text-center align-middle whitespace-nowrap bg-gray-50 w-[48px] min-w-[48px] max-w-[48px] text-xs">
              {vehicle.name}
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
                (r) => r.vehicleId === vehicle.id && r.dayKey === day.key
              );

              return (
                <td
                  key={`${vehicle.id}-${day.key}`}
                  className={`border p-1 align-top ${cellBg} w-[84px] min-w-[84px] max-w-[84px]`}
                >
                  <button
                    className="w-full min-h-[60px] rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 active:scale-[0.99] text-left p-1.5"
                    onClick={() =>
                      openReservationModal(
                        vehicle.id,
                        vehicle.name.replace("\n", " "),
                        day.key,
                        `${day.label}（${day.weekday}）`
                      )
                    }
                    type="button"
                  >
                    <div className="space-y-1">
                      {reservation ? (
                        <div className="space-y-1">
                          {reservation.site && (
                            <div className="font-bold text-xs leading-tight">
                              {reservation.site}
                            </div>
                          )}
                          <div className="text-[11px] text-gray-700 leading-tight">
                            {reservation.userName ?? reservation.name ?? ""}
                          </div>
                          {reservation.projectNo && (
                            <div className="text-[10px] text-gray-500 leading-tight">
                              {reservation.projectNo}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">＋予約</span>
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

        <p className="mt-3 text-xs text-gray-500">
          sharedVehicles件数: {sharedVehicles.length} / reservations件数: {reservations.length}
        </p>
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl">
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
                  value={selectedUserUid}
                  onChange={(e) => setSelectedUserUid(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.name}
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
                  placeholder="例：現場"
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
                <label className="text-sm text-gray-600">用途・備考</label>
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
                type="button"
              >
                決定
              </button>

              <button
                className="rounded-lg border px-4 py-2"
                onClick={closeReservationModal}
                disabled={saving}
                type="button"
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
              type="button"
            >
              この予約を削除
            </button>
          </div>
        </div>
      )}

      {inspectionEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[200]">
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
                type="button"
              >
                決定
              </button>

              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setInspectionEdit(null)}
                type="button"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {showVehicleLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">車両実績</h2>
              <button onClick={() => setShowVehicleLog(false)} type="button">
                ×
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLogMode("vehicle");
                  setSelectedVehicleId("");
                  setSelectedName("");
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  logMode === "vehicle" ? "bg-blue-600 text-white" : "bg-white"
                }`}
                type="button"
              >
                車両
              </button>

              <button
                onClick={() => {
                  setLogMode("name");
                  setSelectedVehicleId("");
                  setSelectedName("");
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  logMode === "name" ? "bg-blue-600 text-white" : "bg-white"
                }`}
                type="button"
              >
                社員
              </button>
            </div>

            {logMode === "vehicle" && (
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">車両を選択</option>
                {sharedVehicles.map((v) => (
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
                {nameHistory.map((name) => (
                  <option key={name} value={name}>
                    {name}
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
                    <div>{r.userName ?? r.name}</div>
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
                (logMode === "name" && !selectedName)) && (
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