"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Circle, Clock3, FileText, HardHat, Package, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  icon: React.ComponentType<{ className?: string }>;
  tasks: string[];
};

const phases: Phase[] = [
  {
    key: "preparation",
    label: "準備工",
    lamp: "orange",
    icon: Package,
    tasks: ["着手前確認", "必要資材の確認", "段取り調整"],
  },
  {
    key: "start",
    label: "着手",
    lamp: "orange",
    icon: HardHat,
    tasks: ["作業開始", "初動写真", "着手報告"],
  },
  {
    key: "midInspection",
    label: "中間検査",
    lamp: "red",
    icon: ShieldCheck,
    tasks: ["中間写真", "検査立会", "指摘確認"],
  },
  {
    key: "change",
    label: "変更",
    lamp: "yellow",
    icon: Wrench,
    tasks: ["変更内容確認", "再段取り", "関係者共有"],
  },
  {
    key: "cleanup",
    label: "片付け",
    lamp: "yellow",
    icon: Clock3,
    tasks: ["残材確認", "片付け", "完了前確認"],
  },
  {
    key: "finalInspection",
    label: "完成検査",
    lamp: "green",
    icon: FileText,
    tasks: ["完成写真", "最終確認", "提出準備"],
  },
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

const demoProject = {
  projectNo: "25-038",
  site: "赤城山法面補修工事",
  assignees: ["設樂 啓明", "永井 和明"],
  orderAmount: "¥20,000,000",
};

export default function MyWorkMainUI() {
  const [currentPhase, setCurrentPhase] = useState<PhaseKey>("preparation");
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  const currentIndex = phases.findIndex((p) => p.key === currentPhase);
  const current = phases[currentIndex];

  const currentTaskKeys = current.tasks.map((task) => `${current.key}:${task}`);
  const completedCount = currentTaskKeys.filter((key) => checkedMap[key]).length;
  const percent = Math.round((completedCount / current.tasks.length) * 100);

  const totalProgress = useMemo(() => {
    const base = (currentIndex / (phases.length - 1)) * 100;
    const currentWeight = (1 / phases.length) * (percent / 100) * 100;
    return Math.min(100, Math.round(base + currentWeight / phases.length));
  }, [currentIndex, percent]);

  const toggleTask = (phaseKey: PhaseKey, task: string) => {
    const key = `${phaseKey}:${task}`;
    setCheckedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    setCurrentPhase(phases[currentIndex - 1].key);
  };

  const goNext = () => {
    if (currentIndex >= phases.length - 1) return;
    setCurrentPhase(phases[currentIndex + 1].key);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="rounded-2xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ポータルへ戻る
          </Button>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-sm">
            My工事 メインUI
          </Badge>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm text-slate-500">案件番号</div>
                <CardTitle className="mt-1 text-2xl">{demoProject.projectNo}</CardTitle>
                <div className="mt-2 text-base text-slate-700">{demoProject.site}</div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm md:text-right">
                <div>
                  <div className="text-slate-500">担当</div>
                  <div className="font-medium text-slate-800">{demoProject.assignees.join(" / ")}</div>
                </div>
                <div>
                  <div className="text-slate-500">受注額</div>
                  <div className="font-medium text-slate-800">{demoProject.orderAmount}</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">工事全体の進み具合</span>
                <span className="font-medium text-slate-700">{totalProgress}%</span>
              </div>
              <Progress value={totalProgress} className="h-3 rounded-full" />
            </div>

            <div className="grid gap-3 md:grid-cols-6">
              {phases.map((phase, idx) => {
                const isCurrent = phase.key === currentPhase;
                const passed = idx < currentIndex;
                const Icon = phase.icon;
                return (
                  <button
                    key={phase.key}
                    onClick={() => setCurrentPhase(phase.key)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      isCurrent
                        ? "border-slate-900 bg-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`h-3 w-3 rounded-full ${lampStyle[phase.lamp]}`} />
                      {passed ? (
                        <Badge className="rounded-full">完了</Badge>
                      ) : isCurrent ? (
                        <Badge variant="secondary" className="rounded-full">
                          現在
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <div className="font-medium text-slate-800">{phase.label}</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{lampLabel[phase.lamp]}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">現在工程</CardTitle>
                  <div className="mt-1 text-sm text-slate-500">
                    ポチポチ進めるだけの最小UI
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                  <div className={`h-3 w-3 rounded-full ${lampStyle[current.lamp]}`} />
                  <span>{lampLabel[current.lamp]}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-lg font-semibold text-slate-900">{current.label}</div>
                <div className="mt-1 text-sm text-slate-500">
                  必要なことだけ確認して前に進める
                </div>
              </div>

              <div className="space-y-3">
                {current.tasks.map((task) => {
                  const checked = checkedMap[`${current.key}:${task}`] ?? false;
                  return (
                    <button
                      key={task}
                      onClick={() => toggleTask(current.key, task)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Circle className={`h-4 w-4 ${checked ? "fill-white text-white" : "text-slate-300"}`} />
                        <span className="font-medium">{task}</span>
                      </div>
                      <span className={`text-sm ${checked ? "text-slate-200" : "text-slate-400"}`}>
                        {checked ? "完了" : "未完"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">この工程の進み具合</span>
                  <span className="font-medium text-slate-700">
                    {completedCount}/{current.tasks.length}
                  </span>
                </div>
                <Progress value={percent} className="h-3 rounded-full" />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="rounded-2xl"
                >
                  前へ
                </Button>
                <Button
                  onClick={goNext}
                  disabled={currentIndex === phases.length - 1}
                  className="rounded-2xl"
                >
                  次へ
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">ざっくり見える情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-2xl border p-4">
                  <div className="text-slate-500">現在の見え方</div>
                  <div className="mt-2 flex items-center gap-2 font-medium text-slate-800">
                    <div className={`h-3 w-3 rounded-full ${lampStyle[current.lamp]}`} />
                    {current.label}
                  </div>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="text-slate-500">今はまだ入れないもの</div>
                  <div className="mt-2 text-slate-700">
                    応援要請、写真、書類、細かい数量入力は後回し
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">このUIで最初にやること</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <div>・案件番号ごとに工程状態を1つ持つ</div>
                <div>・工程を押したら色が変わる</div>
                <div>・工程ごとの最低限チェックだけ置く</div>
                <div>・配車さんから projectNo で飛べるようにする</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
