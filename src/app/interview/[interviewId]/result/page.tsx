"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import interviewService, { InterviewReport } from "@/services/interview.service";

interface PageProps {
    params: Promise<{ interviewId: string }>;
}

const SKILL_CONFIG = [
    { key: "score_communication", label: "Communication", color: "var(--primary)" },
    { key: "score_numeracy", label: "Numeracy", color: "var(--secondary)" },
    { key: "score_creativity", label: "Creativity", color: "var(--accent)" },
    { key: "score_emotional_iq", label: "Emotional IQ", color: "var(--success)" },
] as const;

const REC_COLOR: Record<string, string> = {
    "Strongly Recommended": "var(--success)",
    "Recommended": "var(--primary)",
    "Needs Review": "var(--warning)",
};

export default function InterviewResultPage({ params }: PageProps) {
    const { interviewId } = use(params);
    const router = useRouter();

    const [report, setReport] = useState<InterviewReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let timer: NodeJS.Timeout;

        const checkReport = async () => {
            try {
                const r = await interviewService.getReport(parseInt(interviewId, 10));
                if (!active) return;

                setReport(r);
                if (r.status === "Completed") {
                    setLoading(false);
                    // update sessionStorage so subsequent visits are instant
                    sessionStorage.setItem(`interview_report_${interviewId}`, JSON.stringify(r));
                } else {
                    // Still evaluating, poll again
                    timer = setTimeout(checkReport, 3000);
                }
            } catch (err) {
                if (!active) return;
                setError("Could not load your report. Please try again.");
                setLoading(false);
            }
        };

        // Try sessionStorage first — instant, no network call (only if Completed)
        const raw = sessionStorage.getItem(`interview_report_${interviewId}`);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.status === "Completed") {
                    setReport(parsed);
                    setLoading(false);
                    return;
                }
            } catch (_) { }
        }

        // Start polling immediately
        checkReport();

        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [interviewId]);

    if (loading) {
        const isEvaluating = report && (report.status === "Evaluating" || report.status === "In Progress");
        return (
            <div style={s.center}>
                <div className="spinner" style={{ 
                    marginBottom: "1.5rem",
                    border: "4px solid rgba(0,0,0,0.1)",
                    borderLeftColor: "var(--primary)",
                    borderRadius: "50%",
                    width: "48px",
                    height: "48px",
                    animation: "spin 1s linear infinite"
                }} />
                {isEvaluating ? (
                    <div style={{ textAlign: "center", maxWidth: "450px", padding: "0 1.5rem" }}>
                        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                            Evaluating Your Assessment
                        </h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5" }}>
                            Our evaluation system is grading your response transcript. Please wait...
                        </p>
                    </div>
                ) : (
                    <p style={{ color: "var(--text-secondary)" }}>Loading your report…</p>
                )}
            </div>
        );
    }

    if (error || !report) {
        return (
            <div style={s.center}>
                <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>
            </div>
        );
    }

    const score = Math.round(report.overall_score ?? 0);
    const recColor = REC_COLOR[report.recommendation ?? ""] ?? "var(--primary)";

    // SVG ring calculation
    const r = 50;
    const circ = 2 * Math.PI * r;
    const dash = circ * (score / 100);

    return (
        <div style={s.page} className="result-page-container">

            {/* Report header */}
            <div style={s.reportHeader}>
                <div style={s.reportEmoji}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--success)", margin: "0 auto" }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>
                <h2 style={s.reportTitle}>{report.grade} — Evaluation Complete!</h2>
                <p style={s.reportSub}>Well done, {report.student_name}!</p>
                {report.assessment_title && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                        {report.assessment_title}
                    </p>
                )}
            </div>

            <div style={s.body}>

                {/* Score ring */}
                <div style={s.ringWrap}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r={r} fill="none" stroke="#f0f0f0" strokeWidth="10" />
                        <circle
                            cx="60" cy="60" r={r}
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="10"
                            strokeDasharray={`${dash} ${circ}`}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                            style={{ transition: "stroke-dasharray 1.2s ease" }}
                        />
                        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)">
                            {score}
                        </text>
                        <text x="60" y="72" textAnchor="middle" fontSize="11" fill="#888">
                            / 100
                        </text>
                    </svg>
                    <p style={s.ringLabel}>Overall Score</p>
                    <p style={s.ringName}>{report.student_name}</p>
                </div>

                {/* Skill bars */}
                <div style={s.skillGrid} className="result-skill-grid">
                    {SKILL_CONFIG.map(({ key, label, color }) => {
                        const val = Math.round((report[key as keyof InterviewReport] as number) ?? 0);
                        return (
                            <div key={key} style={s.skillCard}>
                                <p style={s.skillLabel}>{label}</p>
                                <div style={s.barTrack}>
                                    <div style={{ ...s.barFill, width: `${val}%`, background: color }} />
                                </div>
                                <p style={s.skillScore}>
                                    {val}<span style={s.skillOf}>/100</span>
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                {report.summary && (
                    <div style={s.feedbackBox}>
                        <p style={s.feedbackTitle}>Summary</p>
                        <p style={s.feedbackText}>{report.summary}</p>
                    </div>
                )}

                {/* Strengths */}
                {report.strengths && (
                    <div style={s.feedbackBox}>
                        <p style={s.feedbackTitle}>Key Strengths</p>
                        <p style={s.feedbackText}>{report.strengths}</p>
                    </div>
                )}

                {/* Areas to grow */}
                {report.improvements && (
                    <div style={{ ...s.feedbackBox, borderLeftColor: "var(--warning)", background: "var(--warning-light)" }}>
                        <p style={{ ...s.feedbackTitle, color: "var(--warning)" }}>Development Areas</p>
                        <p style={s.feedbackText}>{report.improvements}</p>
                    </div>
                )}

                {/* Admission recommendation */}
                {report.recommendation && (
                    <div style={{ ...s.feedbackBox, borderLeftColor: recColor, background: report.recommendation === "Needs Review" ? "var(--warning-light)" : "var(--success-light)" }}>
                        <p style={{ ...s.feedbackTitle, color: recColor }}>Academic Note</p>
                        <p style={s.feedbackText}>
                            <strong>{report.recommendation}</strong>
                            {report.admin_note && ` — ${report.admin_note}`}
                        </p>
                    </div>
                )}

                {/* Detailed Q&A Report */}
                {report.evaluated_answers && report.evaluated_answers.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                            Detailed Q&A Report
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {report.evaluated_answers.map((item, idx) => {
                                return (
                                    <div key={idx} style={{
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "var(--radius-sm)",
                                        padding: "1rem",
                                        backgroundColor: "var(--bg-glass)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5rem"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                                                Question {idx + 1} ({item.questionType === "mcq" ? "MCQ" : "TITA"})
                                            </span>
                                            <span style={{
                                                padding: "0.2rem 0.5rem",
                                                borderRadius: "12px",
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                backgroundColor: item.isCorrect ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                                color: item.isCorrect ? "var(--success)" : "var(--error)",
                                                border: item.isCorrect ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                                            }}>
                                                {item.isCorrect ? "Correct" : "Incorrect"}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                                            {item.question}
                                        </p>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                                            <div style={{ flex: "1 1 200px" }}>
                                                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Your Answer:</span>{" "}
                                                <span style={{ color: item.isCorrect ? "var(--success)" : "var(--error)" }}>
                                                    {item.studentAnswer || "(No answer)"}
                                                </span>
                                            </div>
                                            <div style={{ flex: "1 1 200px" }}>
                                                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Expected Answer:</span>{" "}
                                                <span style={{ color: "var(--text-primary)" }}>{item.expectedAnswer}</span>
                                            </div>
                                        </div>
                                        {item.explanation && (
                                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem", marginTop: "0.25rem", fontStyle: "italic", margin: 0 }}>
                                                <strong>Feedback:</strong> {item.explanation}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}



            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    page: {
        maxWidth: 700,
        margin: "0 auto",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: 0,
    },
    center: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        gap: "0.5rem",
    },
    reportHeader: {
        background: "linear-gradient(135deg, var(--primary-light), var(--secondary-light))",
        borderRadius: "var(--radius-md) var(--radius-md) 0 0",
        padding: "2rem",
        textAlign: "center",
        color: "var(--text-primary)",
    },
    reportEmoji: { fontSize: 48 },
    reportTitle: {
        fontSize: "1.4rem",
        fontWeight: 700,
        marginTop: "0.5rem",
    },
    reportSub: {
        opacity: 0.85,
        fontSize: "0.9rem",
        marginTop: "0.25rem",
    },
    body: {
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderTop: "none",
        borderRadius: "0 0 var(--radius-md) var(--radius-md)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    ringWrap: { textAlign: "center" },
    ringLabel: {
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        marginTop: "0.25rem",
    },
    ringName: {
        fontSize: "1rem",
        fontWeight: 700,
        color: "var(--text-primary)",
        marginTop: "0.15rem",
    },
    skillGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
    },
    skillCard: {
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-sm)",
        padding: "0.85rem",
    },
    skillLabel: {
        fontSize: "0.75rem",
        color: "var(--text-secondary)",
        marginBottom: "0.4rem",
    },
    barTrack: {
        height: 6,
        background: "#f0f0f0",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: "0.4rem",
    },
    barFill: {
        height: "100%",
        borderRadius: 4,
        transition: "width 1s ease",
    },
    skillScore: {
        fontSize: "1.1rem",
        fontWeight: 700,
        color: "var(--text-primary)",
    },
    skillOf: {
        fontSize: "0.75rem",
        fontWeight: 400,
        color: "var(--text-secondary)",
    },
    feedbackBox: {
        background: "var(--secondary-light)",
        borderRadius: "var(--radius-sm)",
        padding: "1rem",
        borderLeft: "4px solid var(--secondary)",
    },
    feedbackTitle: {
        fontSize: "0.8rem",
        fontWeight: 600,
        color: "var(--primary)",
        marginBottom: "0.35rem",
    },
    feedbackText: {
        fontSize: "0.88rem",
        color: "var(--text-primary)",
        lineHeight: 1.6,
    },
    doneBtn: {
        width: "100%",
        padding: "0.85rem",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 600,
        fontSize: "0.95rem",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
    },
    btnSecondary: {
        padding: "0.6rem 1.2rem",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        fontWeight: 600,
    },
};
