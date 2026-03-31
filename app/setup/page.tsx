"use client";

export default function SetupPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">初期設定</h1>

      <button onClick={() => window.location.assign("/setup/create-company")}>
        会社を作る
      </button>
    </main>
  );
}