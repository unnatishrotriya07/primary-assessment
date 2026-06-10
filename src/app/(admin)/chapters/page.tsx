"use client";

import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ChaptersTable from "@/components/tables/ChaptersTable";
import Modal from "@/components/common/Modal";
import ChapterForm from "@/components/forms/ChapterForm";
import Button from "@/components/common/Button";

export default function ChaptersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Chapters" 
        description="Manage curriculum chapters, topics, and assign them to specific subjects."
        action={
          <Button style={{ whiteSpace: "nowrap" }} onClick={() => setIsModalOpen(true)}>
            Add Chapter
          </Button>
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
