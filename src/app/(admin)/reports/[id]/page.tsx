"use client";

import { use, useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ReportCard from "@/components/cards/ReportCard";
import reportService from "@/services/report.service";
import interviewService, { InterviewReport } from "@/services/interview.service";
import { ReportData } from "@/types/report.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReportDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [interviews, setInterviews] = useState<InterviewReport[]>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportService.getById(id)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(async (err) => {
        console.log("No written report found, attempting to load interviews for assessment", id);
        try {
          const ivs = await interviewService.getByAssessment(parseInt(id, 10));
          if (ivs && ivs.length > 0) {
            setInterviews(ivs);
            setSelectedInterviewId(ivs[0].id);
          } else {
            setError("Could not load report details. No student submissions found.");
          }
        } catch (ivErr) {
          console.error("Failed to load interview reports", ivErr);
          setError("Could not load report details. Please try again.");
        } finally {
          setLoading(false);
        }
      });
  }, [id]);

  const selectedIv = interviews.find(iv => iv.id === selectedInterviewId);

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

        {interviews.length > 0 && selectedIv && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {interviews.length > 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                backgroundColor: "var(--bg-glass)",
                padding: "1rem 1.5rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                marginBottom: "0.5rem"
              }}>
                <label style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                  Select Student Interview:
                </label>
                <select
                  value={selectedInterviewId ?? ""}
                  onChange={(e) => setSelectedInterviewId(Number(e.target.value))}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-app)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    outline: "none"
                  }}
                >
                  {interviews.map(iv => (
                    <option key={iv.id} value={iv.id}>
                      {iv.student_name} ({iv.student_class})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <ReportCard 
              reportId={selectedIv.id.toString()} 
              studentName={selectedIv.student_name} 
              score={selectedIv.overall_score ?? 0} 
              grade={selectedIv.grade ?? "B"} 
              duration="12 mins"
              accuracy={selectedIv.overall_score ?? 0}
              feedback={selectedIv.summary}
              evaluatedAnswers={selectedIv.evaluated_answers}
            />
          </div>
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
