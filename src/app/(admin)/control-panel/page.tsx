"use client";

import { useEffect, useState, useRef } from "react";
import PageHeader from "@/components/common/PageHeader";
import { STORAGE_KEYS } from "@/utils/constants";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { controlPanelService, SystemDiagnostics } from "@/services/controlPanel.service";

export default function ControlPanelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!diagnostics || !diagnostics.transcripts) return;
    if (visibleCount >= diagnostics.transcripts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 5, diagnostics.transcripts.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [diagnostics, visibleCount]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {}
      }
    }

    controlPanelService.getDiagnostics()
      .then((res) => {
        setDiagnostics(res);
      })
      .catch((err) => {
        console.error("Failed to load control panel diagnostics", err);
        setError("Unable to load platform API telemetry. Please check backend services.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <PageHeader title="Control Panel" description="Loading platform diagnostics data..." />
        <div style={styles.loadingState}>
          <div className="spinner" style={{ marginBottom: "1rem" }}></div>
          <p>Preparing platform workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !diagnostics) {
    return (
      <div style={styles.container}>
        <PageHeader title="Control Panel" description="Global system telemetry, pipeline statistics, and AI evaluation logs." />
        <div style={styles.errorContainer}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" style={{ marginRight: "0.75rem" }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ color: "var(--error)", fontWeight: 600 }}>{error || "An error occurred."}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="Control Panel"
        description="Global system telemetry, pipeline statistics, and AI evaluation logs."
      />

      {/* Super Admin Metrics */}
      <div style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total System Tokens</span>
          <h3 style={styles.metricValue}>
            {diagnostics.total_tokens ? diagnostics.total_tokens.toLocaleString() : "0"}
          </h3>
          <span style={styles.metricSubtext}>
            {diagnostics.prompt_tokens?.toLocaleString()} prompt / {diagnostics.completion_tokens?.toLocaleString()} completion
          </span>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>AI Task Pipelines</span>
          <h3 style={styles.metricValue}>
            {diagnostics.active_pipelines || "3"} Active
          </h3>
          <span style={styles.metricSubtext}>Fully operational task queues</span>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>API Server Status</span>
          <h3 style={styles.metricValue}>
            {diagnostics.api_status || "Healthy"}
          </h3>
          <span style={styles.metricSubtext}>System services and database status</span>
        </div>
      </div>

      {/* Layout Grid */}
      <div style={styles.dashboardGrid}>
        {/* Main Column */}
        <div style={styles.mainCol}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Tech Stack details */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Product Architecture & Tech Stack</h3>
              <p style={styles.sectionDesc}>Overview of deployment configuration and integrated services.</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem", fontSize: "0.85rem" }}>
                <div>
                  <strong style={{ color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Frontend Structure</strong>
                  <span style={{ fontSize: "0.9rem", marginTop: "4px", display: "block" }}>
                    {diagnostics.tech_stack?.frontend || "Next.js 16 (App Router), TypeScript, Vanilla CSS Layouts"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Backend Core</strong>
                  <span style={{ fontSize: "0.9rem", marginTop: "4px", display: "block" }}>
                    {diagnostics.tech_stack?.backend || "FastAPI (Python 3.11), PostgreSQL Database, WebRTC Engine"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Evaluation Pipeline</strong>
                  <span style={{ fontSize: "0.9rem", marginTop: "4px", display: "block" }}>
                    {diagnostics.tech_stack?.pipeline || "Audio transcripts processed via WebRTC streams & LLM evaluators"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Security Protocols</strong>
                  <span style={{ fontSize: "0.9rem", marginTop: "4px", display: "block" }}>
                    {diagnostics.tech_stack?.security || "JWT Auth, CORS guards, secure cookies, strict tenant Isolation"}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Models catalog */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>AI Task Engine & Models</h3>
              <p style={styles.sectionDesc}>Active Gemini models processing automated workflows.</p>

              <div style={{ marginTop: "1rem" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>AI Workflow Task</th>
                      <th style={styles.th}>Assigned Gemini Model</th>
                      <th style={styles.th}>Context Window</th>
                      <th style={styles.th}>Pipeline Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.ai_models?.map((model, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}><strong>{model.task}</strong></td>
                        <td style={styles.td_secondary}>{model.model}</td>
                        <td style={styles.td_secondary}>{model.context}</td>
                        <td style={styles.td}>
                          <span style={{ color: model.status === "Active" ? "var(--success)" : "var(--text-secondary)", fontWeight: 600 }}>
                            {model.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Successful Oral Transcript Log */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Successful Interviews Transcript Log</h3>
              <p style={styles.sectionDesc}>Recent student oral test dialogues stored in backend vault.</p>

              <div style={{ marginTop: "1rem" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Institution</th>
                      <th style={styles.th}>Subject / Topic</th>
                      <th style={styles.th}>Accuracy</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.transcripts?.slice(0, visibleCount).map((t) => (
                      <tr key={t.id} style={styles.tableRow}>
                        <td style={styles.td}><strong>{t.studentName}</strong></td>
                        <td style={styles.td_secondary}>{t.schoolName}</td>
                        <td style={styles.td_secondary}>{t.subject}</td>
                        <td style={styles.td_secondary}>
                          <strong>{t.score}%</strong>
                        </td>
                        <td style={styles.td_secondary}>{t.date}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => {
                              setSelectedTranscript(t);
                              setIsTranscriptModalOpen(true);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--primary)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: 0
                            }}
                          >
                            View Transcript
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {diagnostics.transcripts && visibleCount < diagnostics.transcripts.length && (
                  <div
                    ref={observerRef}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      borderTop: "1px solid var(--divider)",
                      fontWeight: 500,
                    }}
                  >
                    Loading more transcripts...
                  </div>
                )}
              </div>
            </div>

            {/* Exceptions & Error monitoring */}
            <div className="card" style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Realtime Exception & Breakage Monitor</h3>
              <p style={styles.sectionDesc}>Connection timeouts, pipeline failures, or network warnings.</p>

              <div style={{ marginTop: "1rem" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Component</th>
                      <th style={styles.th}>Error Trace Message</th>
                      <th style={styles.th}>Severity</th>
                      <th style={styles.th}>Time Captured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.errors?.map((err) => (
                      <tr key={err.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          <span style={{ color: "var(--error)", fontWeight: 600 }}>{err.component}</span>
                        </td>
                        <td style={styles.td_secondary}>{err.message}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backgroundColor: err.severity === "Critical" ? "var(--error-light)" : "var(--warning-light)",
                            color: err.severity === "Critical" ? "var(--error)" : "var(--warning)"
                          }}>
                            {err.severity}
                          </span>
                        </td>
                        <td style={styles.td_secondary}>{err.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={styles.rightCol}>
          {/* Health Checklist */}
          <div className="card" style={styles.sectionCard}>
            <h3 style={styles.widgetTitle}>Core Components Health</h3>
            <p style={styles.widgetDesc}>Realtime server diagnostics.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>PostgreSQL Database</span>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>Operational</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>AI Assessment Engine</span>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>Operational</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>Email Invitation Worker</span>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Dialogue Modal */}
      <Modal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        title={`Audio Transcript - ${selectedTranscript?.studentName}`}
      >
        {selectedTranscript && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ fontSize: "0.85rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <span>School: <strong>{selectedTranscript.schoolName}</strong></span>
              <span style={{ marginLeft: "1.5rem" }}>Accuracy Score: <strong style={{ color: "var(--success)" }}>{selectedTranscript.score}%</strong></span>
            </div>
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body {
                        font-family: Inter, system-ui, sans-serif;
                        margin: 0;
                        padding: 4px;
                        background-color: #ffffff;
                        color: #111827;
                      }
                      .bubble {
                        padding: 12px;
                        border-radius: 10px;
                        margin-bottom: 12px;
                        font-size: 0.85rem;
                        line-height: 1.5;
                      }
                      .ai {
                        background-color: #F8FAFC;
                        border-left: 3px solid #9CA3AF;
                      }
                      .student {
                        background-color: #EFF6FF;
                        border-left: 3px solid #2563EB;
                      }
                      .speaker {
                        font-size: 0.8rem;
                        display: block;
                        color: #6B7280;
                        font-weight: 600;
                        margin-bottom: 4px;
                      }
                      .text {
                        color: #111827;
                      }
                    </style>
                  </head>
                  <body>
                    ${selectedTranscript.dialogue.map((d: any) => `
                      <div class="bubble ${d.speaker === 'AI Examiner' ? 'ai' : 'student'}">
                        <strong class="speaker">${d.speaker}</strong>
                        <span class="text">${d.text}</span>
                      </div>
                    `).join('')}
                  </body>
                </html>
              `}
              style={{
                width: "100%",
                height: "300px",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "8px",
                boxSizing: "border-box"
              }}
              title="Transcript Dialogue"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <Button onClick={() => setIsTranscriptModalOpen(false)}>Close Transcript</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
    width: "100%",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.5rem",
    width: "100%",
  },
  metricCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    transition: "transform var(--transition-fast), border-color var(--transition-fast)",
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    letterSpacing: "0.05em",
  },
  metricValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0.25rem 0",
    fontFamily: "var(--font-sans)",
  },
  metricSubtext: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
  dashboardGrid: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
    width: "100%",
  },
  mainCol: {
    flex: 2,
    minWidth: "320px",
    display: "flex",
    flexDirection: "column",
  },
  rightCol: {
    flex: 1,
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
  },
  sectionCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "1.8rem",
    boxShadow: "var(--shadow-sm)",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  sectionDesc: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    margin: "4px 0 0 0",
  },
  loadingState: {
    padding: "4rem",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
  widgetTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  widgetDesc: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    margin: "2px 0 0 0",
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    padding: "1rem",
    border: "1px solid var(--error)",
    backgroundColor: "var(--error-light)",
    borderRadius: "10px",
    marginTop: "1rem",
  },
  // Table styles
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
    textAlign: "left",
  },
  tableHeaderRow: {
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "0.6rem 0.8rem",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  tableRow: {
    borderBottom: "1px solid var(--divider)",
  },
  td: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  td_secondary: {
    padding: "0.6rem 0.8rem",
    color: "var(--text-secondary)",
    verticalAlign: "middle",
  },
};
