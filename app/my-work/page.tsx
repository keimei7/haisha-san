"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type PhaseKey =
  | "preparation"
  | "start"
  | "midInspection"
  | "change"
  | "cleanup"
  | "finalInspection";

type Lamp = "green" | "orange" | "yellow" | "red";

type Phase = {
  key: PhaseKey;
  label: string;
  lamp: Lamp;
};

type ProjectMaster = {
  id: string;
  name: string[];
  projectNo: string;
  site: string;
  client?: string;
  contractAmount?: string;
  periodStart?: string;
  periodEnd?: string;
};

const phases: Phase[] = [
  { key: "preparation", label: "準備工", lamp: "orange" },
  { key: "start", label: "着手", lamp: "orange" },
  { key: "midInspection", label: "中間検査", lamp: "red" },
  { key: "change", label: "変更", lamp: "yellow" },
  { key: "cleanup", label: "片付け", lamp: "yellow" },
  { key: "finalInspection", label: "完成検査", lamp: "green" },
];

const lampStyle: Record<Lamp, string> = {
  green: "bg-green-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

const lampLabel: Record<Lamp, string> = {
  green: "余裕あり",
  orange: "準備寄り",
  yellow: "施工中",
  red: "検査前",
};

function formatAmount(value?: string) {
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ja-JP");
}

export default function MyWorkPage() {
  const router = useRouter();

  const [projectNo, setProjectNo] = useState("");
  const [site, setSite] = useState("");
  const [name, setName] = useState("");

  const [projects, setProjects] = useState<ProjectMaster[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPhase, setCurrentPhase] = useState<PhaseKey>("preparation");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setProjectNo(params.get("projectNo") ?? "");
    setSite(params.get("site") ?? "");
    setName(params.get("name") ?? "");
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projectMasters"), (snapshot) => {
      const list: ProjectMaster[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          name?: string[] | string;
          projectNo?: string;
          site?: string;
          client?: string;
          contractAmount?: string;
          periodStart?: string;
          periodEnd?: string;
        };

        return {
          id: docSnap.id,
          name: Array.isArray(data.name)
            ? data.name
            : data.name
            ? [data.name]
            : [],
          projectNo: data.projectNo ?? "",
          site: data.site ?? "",
          client: data.client ?? "",
          contractAmount: data.contractAmount ?? "",
          periodStart: data.periodStart ?? "",
          periodEnd: data.periodEnd ?? "",
        };
      });

      setProjects(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentProject = useMemo(() => {
    if (!projectNo) return null;
    return projects.find((p) => p.projectNo === projectNo) ?? null;
  }, [projects, projectNo]);

  const displayProjectNo = currentProject?.projectNo || projectNo || "未選択";
  const displaySite = currentProject?.site || site || "未設定";
  const displayName =
    currentProject?.name?.length ? currentProject.name.join(" / ") : name || "未設定";

  const currentIndex = phases.findIndex((p) => p.key === currentPhase);
  const current = phases[currentIndex];
  const progress = Math.round((currentIndex / (phases.length - 1)) * 100);

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
          <button
            onClick={() => router.push("/portal")}
            className="rounded-lg border px-4 py-2 text-sm bg-white"
          >
            ← ポータルへ戻る
          </button>

          <div>
            <div className="text-sm text-slate-500">案件番号</div>
            <div className="text-3xl font-bold">{displayProjectNo}</div>
          </div>

          <div>
            <div className="text-sm text-slate-500">現場名</div>
            <div className="text-2xl text-slate-900">{displaySite}</div>

            <div className="mt-2 space-y-1 text-sm text-slate-500">
              {currentProject?.client && <div>発注者：{currentProject.client}</div>}

              {currentProject?.contractAmount && (
                <div>請負金額：{formatAmount(currentProject.contractAmount)} 円</div>
              )}

              {(currentProject?.periodStart || currentProject?.periodEnd) && (
                <div>
                  工期：{currentProject?.periodStart || "未設定"} 〜{" "}
                  {currentProject?.periodEnd || "未設定"}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-500">担当</div>
            <div className="text-lg text-slate-800">{displayName}</div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">工事全体の進み具合</span>
              <span className="font-medium text-slate-700">{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {loading && <div className="text-xs text-slate-400">案件情報読み込み中...</div>}
        </div>

        <div className="space-y-3">
          {phases.map((phase, idx) => {
            const isCurrent = phase.key === currentPhase;
            const passed = idx < currentIndex;

            return (
              <button
                key={phase.key}
                onClick={() => setCurrentPhase(phase.key)}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm ${
                  isCurrent ? "border-slate-900" : "border-slate-200"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className={`h-4 w-4 rounded-full ${lampStyle[phase.lamp]}`} />
                  {passed ? (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
                      完了
                    </span>
                  ) : isCurrent ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      現在
                    </span>
                  ) : null}
                </div>

                <div className="text-2xl font-bold text-slate-900">{phase.label}</div>
                <div className="mt-2 text-sm text-slate-500">{lampLabel[phase.lamp]}</div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => currentIndex > 0 && setCurrentPhase(phases[currentIndex - 1].key)}
            disabled={currentIndex === 0}
            className="flex-1 rounded-lg border bg-white px-4 py-3 text-sm disabled:opacity-50"
          >
            前へ
          </button>

          <button
            onClick={() =>
              currentIndex < phases.length - 1 &&
              setCurrentPhase(phases[currentIndex + 1].key)
            }
            disabled={currentIndex === phases.length - 1}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white disabled:opacity-50"
          >
            次へ
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">現在工程</div>
          <div className="mt-1 text-xl font-bold">{current.label}</div>
        </div>
      </div>
    </main>
  );
}