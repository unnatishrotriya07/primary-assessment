"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function QuestionsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/assessments?tab=questions");
  }, [router]);

  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
      Redirecting to Assessments & Questions...
    </div>
  );
}
