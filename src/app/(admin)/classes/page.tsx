"use client";

import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ClassesTable from "@/components/tables/ClassesTable";
import Modal from "@/components/common/Modal";
import ClassForm from "@/components/forms/ClassForm";
import Button from "@/components/common/Button";

export default function ClassesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <PageHeader 
          title="Classes" 
          description="Manage school grades, sections, and view total student assignments."
        />
        <Button onClick={() => setIsModalOpen(true)}>Add New Class</Button>
      </div>

      <div style={styles.content}>
        <ClassesTable refreshTrigger={refreshTrigger} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Class">
        <ClassForm 
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
