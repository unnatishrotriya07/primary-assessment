"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ChaptersTable from "@/components/tables/ChaptersTable";
import Modal from "@/components/common/Modal";
import ChapterForm from "@/components/forms/ChapterForm";
import Button from "@/components/common/Button";

export default function ChaptersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.role === "admin" && !parsed.tenantId) {
            setIsSuperAdmin(true);
          }
        } catch (e) {}
      }
    }
  }, []);

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Chapters" 
        description="Manage curriculum chapters, topics, and assign them to specific subjects."
        action={
          isSuperAdmin ? (
            <Button style={{ whiteSpace: "nowrap" }} onClick={() => setIsModalOpen(true)}>
              Add Chapter
            </Button>
          ) : undefined
        }
      />

      <div style={styles.content}>
        <ChaptersTable refreshTrigger={refreshTrigger} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Chapter">
        <ChapterForm 
          onSuccess={() => {
            setIsModalOpen(false);
            triggerRefresh();
          }} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    width: "100%",
  },
};
