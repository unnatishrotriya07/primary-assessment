"use client";

import React from "react";
import TeamSettings from "@/components/team/TeamSettings";

export default function TeamPage() {
  return (
    <div style={styles.container}>
      <TeamSettings />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    padding: "1rem 0",
  },
};
