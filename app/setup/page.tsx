"use client";

import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-3 border-b">
          <img
            src="/icon.png"
            alt="配車さん"
            className="w-20 h-20 object-contain"
          />
          <div className="text-2xl font-bold tracking-wide">配車さん</div>
          <div className="text-sm text-gray-500">
            初期設定を選んでください
          </div>
        </div>

        <div className="p-6 space-y-4">
          <button
            type="button"
            onClick={() => router.push("/setup/create-company")}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-white font-medium"
          >
            会社を作成
          </button>

          <button
            type="button"
            onClick={() => router.push("/setup/join-company")}
            className="w-full rounded-2xl border border-gray-300 py-3.5 font-medium"
          >
            招待コードで参加
          </button>

          <p className="text-xs leading-5 text-gray-500">
            初めて利用する管理者は「会社を作成」、
            招待された方は「招待コードで参加」を選んでください。
          </p>
        </div>
      </div>
    </main>
  );
}