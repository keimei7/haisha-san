"use client";

import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";


type Vehicle = {
  id: string;
  name: string;
  inspection: string;
  sort: number;
  assignedTo?: string;
};

type Reservation = {
  id: string;
  vehicleId: string;
  dayKey: string;
  userUid: string;
  userName: string;
  site: string;
  projectNo: string;
  updatedAt?: string;
};

function parseDayKey(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDayKey(dayKey: string) {
  const date = parseDayKey(dayKey);
  if (!date) return dayKey;

  const weekdayJa = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdayJa[date.getDay()]}）`;
}

export default function MyPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

useEffect(() => {
  const q = collection(db, "reservations");

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
     const list: Reservation[] = snapshot.docs.map((docSnap) => {
  const data = docSnap.data() as {
    vehicleId?: string;
    dayKey?: string;
    userUid?: string;
    userName?: string;
    site?: string;
    projectNo?: string;
    updatedAt?: string;
  };

  return {
    id: docSnap.id,
    vehicleId: data.vehicleId ?? "",
    dayKey: data.dayKey ?? "",
    userUid: data.userUid ?? "",
    userName: data.userName ?? "",
    site: data.site ?? "",
    projectNo: data.projectNo ?? "",
    updatedAt: data.updatedAt ?? "",
  };
});

      setReservations(list);
      setLoadingReservations(false);
    },
    (error) => {
      console.error("reservations read error:", error);
      alert("予約データの読み込みに失敗しました");
      setLoadingReservations(false);
    }
  );

  return () => unsubscribe();
}, []);

useEffect(() => {
  const q = query(collection(db, "vehicles"), orderBy("sort", "asc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: Vehicle[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          name?: string;
          inspection?: string;
          sort?: number;
          assignedTo?: string;
        };

        return {
          id: docSnap.id,
          name: data.name ?? "",
          inspection: data.inspection ?? "",
          sort: data.sort ?? 0,
          assignedTo: data.assignedTo ?? "",
        };
      });

      setVehicles(list);
      setLoadingVehicles(false);
    },
    (error) => {
      console.error("vehicles read error:", error);
      alert("車両データの読み込みに失敗しました");
      setLoadingVehicles(false);
    }
  );

  return () => unsubscribe();
}, []);

  const sharedVehicles = useMemo(() => {
    return vehicles.filter((v) => !(v.assignedTo ?? "").trim());
  }, [vehicles]);

  const myCars = useMemo(() => {
    if (!userName) return [];
    return vehicles.filter((v) => (v.assignedTo ?? "").trim() === userName.trim());
  }, [vehicles, userName]);

const myReservedSharedCars = useMemo(() => {
 const [uid, setUid] = useState<string | null>(null);

useEffect(() => {
  setUid(auth.currentUser?.uid ?? null);
}, []);
  if (!uid) return [];

  return reservations
    .filter((r) => r.userUid === uid)
    .map((r) => {
      const vehicle = sharedVehicles.find((v) => v.id === r.vehicleId);
      return {
        ...r,
        vehicle,
      };
    })
    .filter(
      (
        item
      ): item is Reservation & {
        vehicle: Vehicle;
      } => !!item.vehicle
    )
    .sort((a, b) => {
      const aDate = parseDayKey(a.dayKey)?.getTime() ?? 0;
      const bDate = parseDayKey(b.dayKey)?.getTime() ?? 0;
      return aDate - bDate;
    });
}, [reservations, sharedVehicles]);

const saveUserName = async () => {
  const trimmed = draftName.trim();

  if (!trimmed) {
    alert("名前を入力してください");
    return;
  }

  const [currentUser, setCurrentUser] = useState<any>(null);

useEffect(() => {
  setCurrentUser(auth.currentUser);
}, []);
  if (!currentUser) {
    alert("ログイン情報がありません。もう一度ログインしてください");
    router.push("/login");
    return;
  }

  try {
    setSavingUser(true);

    await setDoc(doc(db, "users", currentUser.uid), {
      name: trimmed,
      email: currentUser.email ?? "",
      uid: currentUser.uid,
      updatedAt: new Date().toISOString(),
    });

    setUserName(trimmed);
    localStorage.setItem("userName", trimmed);
  } catch (error) {
    console.error("user save error:", error);
    alert("ユーザ登録に失敗しました");
  } finally {
    setSavingUser(false);
  }
};

  const clearUserName = () => {
    const ok = window.confirm("登録ユーザを変更しますか？");
    if (!ok) return;

    localStorage.removeItem("userName");
    setUserName("");
    setDraftName("");
  };

  const goToReservation = () => {
  const params = new URLSearchParams();

  if (userName) {
    params.set("name", userName);
  }

  router.push(`/reserve?${params.toString()}`);
};

  const isLoading = loadingVehicles || loadingReservations;

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-white py-3 px-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="配車さん" className="w-10 h-10" />
              <div className="font-bold text-lg">👤 マイページ</div>
            </div>

            <button
              className="rounded-lg border px-3 py-2 text-lg"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              ☰
            </button>
          </div>

          {showMenu && (
            <div className="border-b bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-lg bg-blue-600 text-white py-2 text-sm"
                  onClick={() => {
                    setShowMenu(false);
                    goToReservation();
                  }}
                >
                  🚚 予約ページ
                </button>

                <button
                  className="rounded-lg border py-2 text-sm bg-white"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/manage");
                  }}
                >
                  ⚙️ 管理ページ
                </button>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            {!userName ? (
              <>
                

                <button
                  className="w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-50"
                  onClick={saveUserName}
                  disabled={savingUser}
                >
                  この名前で開始
                </button>

                <p className="text-xs text-gray-500">
                  初回に登録した名前が、この端末のユーザとして保存されます。
                </p>
              </>
            ) : (
              <div className="rounded-xl border bg-gray-50 px-4 py-3">
                <div className="text-sm text-gray-500">現在のユーザ</div>
                <div className="mt-1 text-lg font-bold">{userName}</div>

                <button
                  className="mt-3 rounded-lg border bg-white px-3 py-2 text-sm"
                  onClick={clearUserName}
                >
                  ユーザ変更
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">予約済み共有車</h2>
            {userName && (
              <div className="text-sm text-gray-500">{myReservedSharedCars.length}件</div>
            )}
          </div>

          {!userName && (
            <div className="text-sm text-gray-500">先にユーザ登録してください</div>
          )}

          {userName && isLoading && (
            <div className="text-sm text-gray-500">読み込み中...</div>
          )}

          {userName && !isLoading && myReservedSharedCars.length === 0 && (
            <div className="text-sm text-gray-500">予約された共有車はありません</div>
          )}

          <div className="space-y-3">
            {myReservedSharedCars.map((item) => (
              <div key={item.id} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-lg whitespace-pre-line">
                      {item.vehicle.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDayKey(item.dayKey)}
                    </div>
                  </div>
                </div>

                {item.site && (
                  <div className="text-gray-800">行先: {item.site}</div>
                )}

                {item.projectNo && (
                  <div className="text-sm text-gray-600">
                    用途・案件番号: {item.projectNo}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  車検: {item.vehicle.inspection || "未設定"}
                </div>

                <button
                  className="w-full rounded-lg border py-2 text-sm"
                  onClick={goToReservation}
                >
                  予約ページへ
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">マイカー</h2>
            {userName && (
              <div className="text-sm text-gray-500">{myCars.length}台</div>
            )}
          </div>

          {!userName && (
            <div className="text-sm text-gray-500">先にユーザ登録してください</div>
          )}

          {userName && isLoading && (
            <div className="text-sm text-gray-500">読み込み中...</div>
          )}

          {userName && !isLoading && myCars.length === 0 && (
            <div className="text-sm text-gray-500">割り振られたマイカーはありません</div>
          )}

          <div className="space-y-3">
            {myCars.map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-lg whitespace-pre-line">
                    {vehicle.name}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  車検: {vehicle.inspection || "未設定"}
                </div>

                <div className="text-sm text-gray-500">
                  担当者: {vehicle.assignedTo || "未設定"}
                </div>

                <button
                  className="w-full rounded-lg border py-2 text-sm"
                  onClick={goToReservation}
                >
                  予約ページへ
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}