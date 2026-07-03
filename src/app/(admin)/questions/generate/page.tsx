"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function QuestionGeneratePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/assessments?tab=generate");
  }, [router]);

  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
      Redirecting to Question Generator...
    </div>
  );
}
