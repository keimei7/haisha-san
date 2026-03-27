"use client";

import { useEffect } from "react";

export default function SignupRedirectPage() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return <main className="p-4">読み込み中...</main>;
}