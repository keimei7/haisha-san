"use client";

import { useRouter } from "next/navigation";

export default function ManagePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-md rounded-2xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">管理ページ</h1>
          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() => router.push("/mypage")}
          >
            ← マイページ
          </button>
        </div>

        <div className="text-sm text-gray-500">
          まずは管理ページの入口だけ復旧しています。
        </div>
      </div>
    </main>
  );
}