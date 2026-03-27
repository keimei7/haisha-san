"use client";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <button
        type="button"
        onClick={() => alert("押せた")}
        style={{
          padding: 20,
          background: "blue",
          color: "white",
          border: "none",
          fontSize: 18,
        }}
      >
        テスト
      </button>
    </main>
  );
}