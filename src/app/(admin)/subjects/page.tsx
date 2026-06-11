"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import SubjectsTable from "@/components/tables/SubjectsTable";
import Modal from "@/components/common/Modal";
import SubjectForm from "@/components/forms/SubjectForm";
import Button from "@/components/common/Button";

export default function SubjectsPage() {
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
        title="Subjects"
        description="View and structure school academic subjects linked to your curriculum."
        action={
          isSuperAdmin ? (
            <Button style={{ whiteSpace: "nowrap" }} onClick={() => setIsModalOpen(true)}>
              Add Subject
            </Button>
          ) : undefined
        }
      />

      <div style={styles.content}>
        <SubjectsTable refreshTrigger={refreshTrigger} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Subject">
        <SubjectForm
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
