"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Project = {
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

export default function ProjectMasterPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState<string[]>([]);
  const [formProjectNo, setFormProjectNo] = useState("");
  const [formSite, setFormSite] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [tempMembers, setTempMembers] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projectMasters"), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
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

      list.sort((a, b) => a.projectNo.localeCompare(b.projectNo, "ja"));
      setProjects(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormName([]);
    setFormProjectNo("");
    setFormSite("");
    setEditingProject(null);
    setSaving(false);
  };

  const openMemberModal = () => {
    setTempMembers(formName);
    setShowMemberModal(true);
  };

  const toggleTempMember = (member: string) => {
    setTempMembers((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member]
    );
  };

  const confirmMembers = () => {
    setFormName(tempMembers);
    setShowMemberModal(false);
  };

  const addProject = async () => {
    if (formName.length === 0 || !formProjectNo || !formSite) {
      alert("全部入力してください");
      return;
    }

    try {
      setSaving(true);

      await addDoc(collection(db, "projectMasters"), {
        name: formName,
        projectNo: formProjectNo.trim(),
        site: formSite.trim(),
        updatedAt: new Date().toISOString(),
      });

      resetForm();
    } catch (error) {
      console.error("project add error:", error);
      alert("案件追加に失敗しました");
      setSaving(false);
    }
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormProjectNo(project.projectNo);
    setFormSite(project.site);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveEdit = async () => {
    if (!editingProject) return;

    if (formName.length === 0 || !formProjectNo || !formSite) {
      alert("全部入力してください");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "projectMasters", editingProject.id), {
        name: formName,
        projectNo: formProjectNo.trim(),
        site: formSite.trim(),
        updatedAt: new Date().toISOString(),
      });

      resetForm();
    } catch (error) {
      console.error("project update error:", error);
      alert("案件更新に失敗しました");
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    const ok = window.confirm("削除しますか？");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "projectMasters", id));

      if (editingProject?.id === id) {
        resetForm();
      }
    } catch (error) {
      console.error("project delete error:", error);
      alert("削除に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border overflow-hidden">
          <div className="bg-white py-3 px-4 flex items-center justify-between border-b">
            <div className="font-bold text-lg">🥸 案件マスター</div>

            <button
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={() => router.push("/portal")}
            >
              ← ポータル
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="text-sm text-gray-600">社員（複数選択可）</label>

              <button
                type="button"
                onClick={openMemberModal}
                disabled={saving}
                className="w-full border rounded-lg px-3 py-3 text-left bg-white mt-1"
              >
                {formName.length > 0 ? formName.join("、") : "社員を選択"}
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-600">工事番号</label>
              <input
                value={formProjectNo}
                onChange={(e) => setFormProjectNo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">現場名</label>
              <input
                value={formSite}
                onChange={(e) => setFormSite(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                disabled={saving}
              />
            </div>

            {editingProject ? (
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50"
                >
                  保存
                </button>

                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={addProject}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
              >
                ＋登録
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-sm text-gray-500">読み込み中...</div>}

          {!loading &&
            projects.map((p) => (
              <div key={p.id} className="rounded-xl border p-3 space-y-2">
                <div className="font-bold text-lg">{p.projectNo}</div>
                <div>{p.site}</div>
                <div className="text-sm text-gray-500">
                  担当: {p.name.join(" / ")}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    編集
                  </button>

                  <button
                    onClick={() => deleteProject(p.id)}
                    className="rounded-lg border border-red-400 text-red-500 px-3 py-2 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showMemberModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">社員を選択</h2>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="text-2xl leading-none text-gray-500"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
              {memberOptions.map((member) => {
                const checked = tempMembers.includes(member);

                return (
                  <button
                    key={member}
                    type="button"
                    onClick={() => toggleTempMember(member)}
                    className={`w-full rounded-lg border px-3 py-3 text-left ${
                      checked ? "bg-blue-50 border-blue-500" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{member}</span>
                      {checked && <span className="text-blue-600 font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t flex gap-2">
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="rounded-lg border px-4 py-2"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={confirmMembers}
                className="flex-1 rounded-lg bg-blue-600 text-white py-2"
              >
                決定
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}