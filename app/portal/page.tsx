"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ProjectMaster = {
  id: string;
  name: string[];
  projectNo: string;
  site: string;
};

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
];

export default function PortalPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [projects, setProjects] = useState<ProjectMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("portalUserName");
    if (saved) {
      setUserName(saved);
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "projectMasters"), orderBy("projectNo", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ProjectMaster[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          name?: string[] | string;
          projectNo?: string;
          site?: string;
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
        };
      });

      setProjects(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const myProjects = useMemo(() => {
    if (!userName) return [];
    return projects
      .filter((p) => p.name.includes(userName))
      .sort((a, b) => a.projectNo.localeCompare(b.projectNo, "ja"));
  }, [projects, userName]);

  const goToHaisha = (project?: ProjectMaster) => {
    const params = new URLSearchParams();

    if (project) {
      params.set("projectNo", project.projectNo);
      params.set("site", project.site);
    }

    if (userName) {
      params.set("name", userName);
      localStorage.setItem("portalUserName", userName);
      localStorage.setItem("userName", userName);
    }

    router.push(`/?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-white py-3 px-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="TakaTok" className="w-10 h-10" />
              <div className="font-bold text-lg">🏢 TakaTok ポータル</div>
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
                    goToHaisha();
                  }}
                >
                  🚚 配車さん
                </button>

                <button
                  className="rounded-lg border py-2 text-sm bg-white"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/projects");
                  }}
                >
                  🥸 案件マスター
                </button>

                <button
                  className="rounded-lg border py-2 text-sm text-gray-400"
                  disabled
                >
                  ⏰ 勤怠くん
                </button>

                <button
                  className="rounded-lg border py-2 text-sm text-gray-400"
                  disabled
                >
                  🏗 重機くん
                </button>
              </div>
            </div>
          )}

          <div className="p-4">
            <label className="text-sm text-gray-600">自分の名前</label>
            <select
              value={userName}
              onChange={(e) => {
                const value = e.target.value;
                setUserName(value);
                localStorage.setItem("portalUserName", value);
                localStorage.setItem("userName", value);
              }}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            >
              <option value="">選択してください</option>
              {memberOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex justify-between">
            <h2 className="font-bold text-lg">担当案件</h2>
            {userName && (
              <div className="text-sm text-gray-500">{myProjects.length}件</div>
            )}
          </div>

          {!userName && (
            <div className="text-sm text-gray-500">
              名前を選択してください
            </div>
          )}

          {userName && loading && (
            <div className="text-sm text-gray-500">読み込み中...</div>
          )}

          {userName && !loading && myProjects.length === 0 && (
            <div className="text-sm text-gray-500">担当案件はありません</div>
          )}

         <div className="space-y-3">
  {myProjects.map((project) => (
    <div key={project.id} className="rounded-xl border p-3 space-y-2">
      <div className="font-bold text-lg">{project.projectNo}</div>
      <div className="text-gray-700">{project.site}</div>
      <div className="text-sm text-gray-500">
        担当: {project.name.join(" / ")}
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm"
          onClick={() => goToHaisha(project)}
        >
          配車
        </button>

        <button
          className="flex-1 rounded-lg border py-2 text-sm"
          onClick={() => {
            const params = new URLSearchParams();

            params.set("projectNo", project.projectNo);
            params.set("site", project.site);

            if (userName) {
              params.set("name", userName);
            }

            router.push(`/my-work?${params.toString()}`);
          }}
        >
          My工事
        </button>
      </div>
    </div>
  ))}
</div>
        </div>
      </div>
    </main>
  );
}