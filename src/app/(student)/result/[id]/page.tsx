"use client";

import { use, useEffect, useState } from "react";
import ResultSummary from "@/components/student/ResultSummary";
import PageHeader from "@/components/common/PageHeader";
import reportService from "@/services/report.service";
import assessmentService from "@/services/assessment.service";
import { ReportData } from "@/types/report.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ResultPage({ params }: PageProps) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse report ID (e.g. rep_12 -> 12)
    let reportId = id;
    if (id.startsWith("rep_")) {
      reportId = id.replace("rep_", "");
    }

    setLoading(true);
    setError(null);

    reportService.getById(reportId)
      .then(async (reportData) => {
        setReport(reportData);
        
        // Fetch assessment to find out total questions count
        if (reportData.assessmentId) {
          try {
            const asmt = await assessmentService.getById(reportData.assessmentId.toString());
            if (asmt && asmt.questionsCount) {
              setTotalQuestions(asmt.questionsCount);
            }
          } catch (asmtErr) {
            console.error("Failed to load assessment metadata", asmtErr);
            // Non-critical, fall back to default questions count
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch report details", err);
        setError("Could not load result summary. Please try again.");
        setLoading(false);
      });
  }, [id]);

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Assessment Submitted!" 
        description="Great job! Your answers have been recorded. See below for a preliminary summary."
      />
      
      <div style={styles.content}>
        {loading && (
          <div style={styles.loading}>
            <div className="spinner" style={{ marginBottom: "1rem", margin: "0 auto" }}></div>
            Retrieving your assessment results...
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {report && !loading && (
          <ResultSummary 
            id={id} 
            score={Math.round(report.score)} 
            totalQuestions={totalQuestions} 
            correctAnswers={Math.round((report.score / 100) * totalQuestions)} 
            timeSpent={report.duration || "12 mins"} 
            feedback={report.feedback || "Good job on completing the assessment!"}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  content: {
    width: "100%",
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
