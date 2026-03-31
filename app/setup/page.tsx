"use client";

import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-black p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border bg-white p-5 space-y-4">
        <h1 className="text-xl font-bold">初期設定</h1>
        <p className="text-sm text-gray-500">
          会社を作成するか、招待コードで参加してください。
        </p>

        <button
          className="w-full rounded-xl bg-blue-600 text-white py-3"
          onClick={() => router.push("/setup/create-company")}
          type="button"
        >
          会社を作成
        </button>

        <button
          className="w-full rounded-xl border py-3"
          onClick={() => router.push("/setup/join-company")}
          type="button"
        >
          招待コードで参加
        </button>
      </div>
    </main>
  );
}