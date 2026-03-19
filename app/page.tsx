"use client";

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

export default function Home() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

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
          };

          return {
            id: docSnap.id,
            inspection: data.inspection ?? "",
            name: data.name ?? "",
            sort: data.sort ?? 0,
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

  const openReservationModal = (
    vehicleId: string,
    vehicleName: string,
    dayKey: string,
    dateLabel: string
  ) => {
    const existing = reservations.find(
      (r) => r.vehicleId === vehicleId && r.dayKey === dayKey
    );

    setSelectedSlot({ vehicleId, vehicleName, dayKey, dateLabel });
    setFormName(existing?.name ?? "");
    setFormSite(existing?.site ?? "");
    setFormProjectNo(existing?.projectNo ?? "");
  };

  const closeReservationModal = () => {
    setSelectedSlot(null);
    setFormName("");
    setFormSite("");
    setFormProjectNo("");
    setSaving(false);
  };

  const saveReservation = async () => {
    if (!selectedSlot) return;

    const trimmedName = formName.trim();
    const trimmedSite = formSite.trim();
    const trimmedProjectNo = formProjectNo.trim();

    if (!trimmedName) {
      alert("自分の名前を入れてください");
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

  const deleteReservation = async () => {
    if (!selectedSlot) return;

    const reservationId = makeReservationId(
      selectedSlot.vehicleId,
      selectedSlot.dayKey
    );

    try {
      setSaving(true);
      await deleteDoc(doc(db, "reservations", reservationId));
      closeReservationModal();
    } catch (error) {
      console.error("reservation delete error:", error);
      alert("予約の削除に失敗しました");
      setSaving(false);
    }
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

  return (
    <main className="min-h-screen bg-white text-black p-3">
      <div className="mx-auto max-w-md">
       <div className="mb-3 rounded-xl border overflow-hidden">

  {/* 🔵 ロゴヘッダー（追加する部分） */}
  <div className="bg-white py-2 flex items-center justify-center gap-1 border-b">
    <img
      src="/icon.png"
      alt="配車さん"
      className="w-15 h-15 object-contain"
    />
    <div className="font-bold text-lg tracking-wide">配車さん</div>
  </div>

  {/* 🟡 元の黄色ヘッダー */}
  <div className="bg-yellow-300 text-center font-bold py-2 text-lg">
    車両運行表
  </div>

  {/* 週切り替え */}
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
                const isSaltCar = vehicle.name.includes("2tダンプ");

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

                    {isSaltCar ? (
                      <td
                        colSpan={days.length}
                        className="border text-center text-2xl font-bold py-4 bg-gray-100"
                      >
                        塩カル散布用
                      </td>
                    ) : (
                      days.map((day) => {
                        const isSunday = day.date.getDay() === 0;
                        const isSaturday = day.date.getDay() === 6;

                        const cellBg = isSunday
                          ? "bg-red-50"
                          : isSaturday
                          ? "bg-blue-50"
                          : "bg-white";

                        const reservation = reservations.find(
                          (r) =>
                            r.vehicleId === vehicle.id && r.dayKey === day.key
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
                              {reservation ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-sm">
                                    {reservation.name}
                                  </div>
                                  {reservation.site && (
                                    <div className="text-xs text-gray-700">
                                      {reservation.site}
                                    </div>
                                  )}
                                  {reservation.projectNo && (
                                    <div className="text-xs text-gray-500">
                                      {reservation.projectNo}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">＋予約</span>
                              )}
                            </button>
                          </td>
                        );
                      })
                    )}
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl space-y-3">
            <div>
              <h2 className="text-lg font-bold">予約入力</h2>
              <p className="text-sm text-gray-500">
                {selectedSlot.vehicleName}
                <br />
                {selectedSlot.dateLabel}
              </p>
            </div>

            <label className="block">
              <div className="mb-1 text-sm font-medium">自分の名前</div>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例：髙特 のりお"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium">現場名</div>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={formSite}
                onChange={(e) => setFormSite(e.target.value)}
                placeholder="例：吾妻山"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium">工事番号</div>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={formProjectNo}
                onChange={(e) => setFormProjectNo(e.target.value)}
                placeholder="例：25−038"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
                onClick={saveReservation}
                disabled={saving}
              >
                {saving ? "保存中..." : "決定"}
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
              className="w-full rounded-lg border border-red-300 text-red-600 py-2 disabled:opacity-50"
              onClick={deleteReservation}
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
    </main>
  );
}