"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  companyId: string;
  role: "admin" | "member";
};

type CompanyDoc = {
  name: string;
  inviteCode: string;
  ownerUid: string;
};

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

  const [me, setMe] = useState<UserDoc | null>(null);
  const [company, setCompany] = useState<CompanyDoc | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const run = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        window.location.replace("/");
        return;
      }

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (!userSnap.exists()) {
        window.location.replace("/setup");
        return;
      }

      const userData = userSnap.data() as UserDoc;
      setMe(userData);

      if (userData.companyId) {
        const companySnap = await getDoc(doc(db, "companies", userData.companyId));
        if (companySnap.exists()) {
          setCompany(companySnap.data() as CompanyDoc);
        }
      }

      setLoadingUser(false);
    };

    run();
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
      () => setLoadingVehicles(false)
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
      () => setLoadingReservations(false)
    );

    return () => unsubscribe();
  }, []);

  const sharedVehicles = useMemo(() => {
    return vehicles.filter((v) => !(v.assignedTo ?? "").trim());
  }, [vehicles]);

  const myCars = useMemo(() => {
    if (!me?.displayName) return [];
    return vehicles.filter((v) => (v.assignedTo ?? "").trim() === me.displayName.trim());
  }, [vehicles, me]);

  const myReservedSharedCars = useMemo(() => {
    if (!me?.uid) return [];

    return reservations
      .filter((r) => r.userUid === me.uid)
      .map((r) => {
        const vehicle = sharedVehicles.find((v) => v.id === r.vehicleId);
        return {
          ...r,
          vehicle,
        };
      })
      .filter((item): item is Reservation & { vehicle: Vehicle } => !!item.vehicle)
      .sort((a, b) => {
        const aDate = parseDayKey(a.dayKey)?.getTime() ?? 0;
        const bDate = parseDayKey(b.dayKey)?.getTime() ?? 0;
        return aDate - bDate;
      });
  }, [reservations, sharedVehicles, me]);

  const goToReservation = () => {
    router.push("/reserve");
  };

  const copyInviteCode = async () => {
    if (!company?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(company.inviteCode);
      alert("招待コードをコピーしました");
    } catch {
      alert(`招待コード: ${company.inviteCode}`);
    }
  };

  const isLoading = loadingUser || loadingVehicles || loadingReservations;

  if (loadingUser) {
    return <main className="p-4">読み込み中...</main>;
  }

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
            <div className="border-b bg-gray-50 p-3 space-y-2">
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

                {me?.role === "admin" && (
                  <button
                    className="rounded-lg border py-2 text-sm bg-white"
                    onClick={() => {
                      setShowMenu(false);
                      router.push("/manage");
                    }}
                  >
                    ⚙️ 管理ページ
                  </button>
                )}
              </div>

              {company?.inviteCode && (
                <div className="rounded-xl border bg-white p-3 space-y-2">
                  <div className="text-sm text-gray-500">招待コード</div>
                  <div className="text-xl font-bold tracking-widest">
                    {company.inviteCode}
                  </div>
                  <button
                    className="w-full rounded-lg border py-2 text-sm"
                    onClick={copyInviteCode}
                  >
                    招待コードをコピー
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-4 space-y-2">
            <div className="text-sm text-gray-500">現在のユーザ</div>
            <div className="text-lg font-bold">{me?.displayName}</div>
            {company?.name && (
              <div className="text-sm text-gray-600">所属会社: {company.name}</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">予約済み共有車</h2>
            <div className="text-sm text-gray-500">{myReservedSharedCars.length}件</div>
          </div>

          {isLoading && <div className="text-sm text-gray-500">読み込み中...</div>}

          {!isLoading && myReservedSharedCars.length === 0 && (
            <div className="text-sm text-gray-500">予約された共有車はありません</div>
          )}

          <div className="space-y-3">
            {myReservedSharedCars.map((item) => (
              <div key={item.id} className="rounded-xl border p-3 space-y-2">
                <div>
                  <div className="font-bold text-lg whitespace-pre-line">
                    {item.vehicle.name}
                  </div>
                  <div className="text-sm text-gray-600">{formatDayKey(item.dayKey)}</div>
                </div>

                {item.site && <div className="text-gray-800">行先: {item.site}</div>}

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
            <div className="text-sm text-gray-500">{myCars.length}台</div>
          </div>

          {isLoading && <div className="text-sm text-gray-500">読み込み中...</div>}

          {!isLoading && myCars.length === 0 && (
            <div className="text-sm text-gray-500">割り振られたマイカーはありません</div>
          )}

          <div className="space-y-3">
            {myCars.map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border p-3 space-y-2">
                <div className="font-bold text-lg whitespace-pre-line">{vehicle.name}</div>

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