"use client";

import React, { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import AssessmentsTable from "@/components/tables/AssessmentsTable";
import Button from "@/components/common/Button";
import CreateAssessmentModal from "@/components/forms/CreateAssessmentModal";

export default function AssessmentsClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Assessments" 
        description="Schedule, configure, and monitor ongoing evaluations and exam configurations."
        action={
          <Button onClick={() => setIsModalOpen(true)} variant="primary">
            + Create Assessment
          </Button>
        }
      />

      <div style={styles.content}>
        <AssessmentsTable key={refreshKey} />
      </div>

      <CreateAssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
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
  content: {
    width: "100%",
  },
};
