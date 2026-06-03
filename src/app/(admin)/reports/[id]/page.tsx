"use client";

import { use, useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ReportCard from "@/components/cards/ReportCard";
import reportService from "@/services/report.service";
import { ReportData } from "@/types/report.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReportDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportService.getById(id)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load report", err);
        setError("Could not load report details. Please try again.");
        setLoading(false);
      });
  }, [id]);

  return (
    <div style={styles.container}>
      <PageHeader 
        title={`Report Detail: #${id}`} 
        description="Comprehensive score breakdown, skill matrices, and visual performance curves."
      />

      <div style={styles.content}>
        {loading && (
          <div style={styles.loading}>
            Loading report card details...
          </div>
        )}
        
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
        
        {report && (
          <ReportCard 
            reportId={report.id?.toString() || report.reportId || id} 
            studentName={report.studentName} 
            score={report.score} 
            grade={report.grade} 
            duration={report.duration} 
            accuracy={report.accuracy}
            feedback={report.feedback}
          />
        )}
      </div>
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
    maxWidth: "800px",
    margin: "0 auto",
  },
  loading: {
    textAlign: "center",
    padding: "3rem",
    color: "var(--text-secondary)",
    fontSize: "1.1rem",
  },
  error: {
    textAlign: "center",
    padding: "2rem",
    color: "var(--danger)",
    backgroundColor: "var(--danger-light)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
};
