"use client";

import React, { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import AssessmentsTable from "@/components/tables/AssessmentsTable";
import QuestionsTable from "@/components/tables/QuestionsTable";
import QuestionGeneratorForm from "@/components/forms/QuestionGeneratorForm";
import Button from "@/components/common/Button";
import CreateAssessmentModal from "@/components/forms/CreateAssessmentModal";

export default function AssessmentsClient() {
  const [activeTab, setActiveTab] = useState("assessments");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "questions" || tab === "generate") {
        setActiveTab(tab);
      } else {
        setActiveTab("assessments");
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const getHeaderDescription = () => {
    if (activeTab === "assessments") {
      return "Schedule, configure, and monitor ongoing evaluations and exam configurations.";
    }
    if (activeTab === "questions") {
      return "Browse, filter, and inspect existing assessment questions.";
    }
    return "Configure topic, difficulty, cognitive level, and generate classroom-ready questions using AI.";
  };

  const getHeaderAction = () => {
    if (activeTab === "assessments") {
      return (
        <Button onClick={() => setIsModalOpen(true)} variant="primary">
          + Create Assessment
        </Button>
      );
    }
    if (activeTab === "questions") {
      return (
        <Button onClick={() => handleTabChange("generate")} variant="primary">
          Generate Questions
        </Button>
      );
    }
    return undefined;
  };

  const tabs = [
    { id: "assessments", label: "Assessments" },
    { id: "questions", label: "Question Bank" },
    { id: "generate", label: "AI Generator" },
  ];

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Assessments & Questions" 
        description={getHeaderDescription()}
        action={getHeaderAction()}
      />

      <div style={styles.tabsHeader}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                ...styles.tabItem,
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                borderBottomColor: isActive ? "var(--primary)" : "transparent",
                fontWeight: isActive ? 600 : 500,
              }}
              className="interactive-element"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={styles.content}>
        {activeTab === "assessments" && (
          <div className="animate-fade-in">
            <AssessmentsTable key={refreshKey} />
          </div>
        )}
        {activeTab === "questions" && (
          <div className="animate-fade-in">
            <QuestionsTable />
          </div>
        )}
        {activeTab === "generate" && (
          <div className="animate-fade-in" style={styles.generatorWrapper}>
            <div className="glass-panel" style={styles.formContainer}>
              <QuestionGeneratorForm />
            </div>
          </div>
        )}
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
    gap: "1.5rem",
    padding: "1rem 0",
  },
  tabsHeader: {
    display: "flex",
    gap: "2rem",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "0.5rem",
    width: "100%",
  },
  tabItem: {
    padding: "0.8rem 0",
    borderBottom: "2px solid transparent",
    fontSize: "0.95rem",
    cursor: "pointer",
    background: "none",
    borderLeft: "none",
    borderRight: "none",
    borderTop: "none",
    transition: "all var(--transition-fast)",
  },
  content: {
    width: "100%",
  },
  generatorWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  formContainer: {
    padding: "2rem",
    width: "100%",
    maxWidth: "800px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "var(--shadow-sm)",
  },
};
