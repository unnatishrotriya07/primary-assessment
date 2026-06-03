"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import interviewService, { InterviewReport } from "@/services/interview.service";

interface PageProps {
    params: Promise<{ interviewId: string }>;
}

const SKILL_CONFIG = [
    { key: "score_communication", label: "Communication", color: "#667eea" },
    { key: "score_numeracy", label: "Numeracy", color: "#11998e" },
    { key: "score_creativity", label: "Creativity", color: "#f093fb" },
    { key: "score_emotional_iq", label: "Emotional IQ", color: "#f5a623" },
] as const;

const REC_COLOR: Record<string, string> = {
    "Strongly Recommended": "#11998e",
    "Recommended": "#667eea",
    "Needs Review": "#f5a623",
};

export default function InterviewResultPage({ params }: PageProps) {
    const { interviewId } = use(params);
    const router = useRouter();

    const [report, setReport] = useState<InterviewReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Try sessionStorage first — instant, no network call
        const raw = sessionStorage.getItem(`interview_report_${interviewId}`);
        if (raw) {
            try {
                setReport(JSON.parse(raw));
                setLoading(false);
                return;
            } catch (_) { }
        }
        // Fallback: fetch from API
        interviewService.getReport(parseInt(interviewId, 10))
            .then(r => { setReport(r); setLoading(false); })
            .catch(() => {
                setError("Could not load your report. Please try again.");
                setLoading(false);
            });
    }, [interviewId]);

    if (loading) {
        return (
            <div style={s.center}>
                <div className="spinner" style={{ marginBottom: "1rem" }} />
                <p>Loading your report…</p>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div style={s.center}>
                <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>
                <button onClick={() => router.push("/")} style={s.btnSecondary}>
                    Return to Portal
                </button>
            </div>
        );
    }

    const score = Math.round(report.overall_score ?? 0);
    const recColor = REC_COLOR[report.recommendation ?? ""] ?? "#667eea";

    // SVG ring calculation
    const r = 50;
    const circ = 2 * Math.PI * r;
    const dash = circ * (score / 100);

    return (
        <div style={s.page}>

            {/* Report header */}
            <div style={s.reportHeader}>
                <div style={s.reportEmoji}>
                    {score >= 80 ? "🏆" : score >= 60 ? "🌟" : "👍"}
                </div>
                <h2 style={s.reportTitle}>{report.grade} — Interview Complete!</h2>
                <p style={s.reportSub}>Well done, {report.student_name}! 🎉</p>
                {report.assessment_title && (
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
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
                            stroke="#667eea"
                            strokeWidth="10"
                            strokeDasharray={`${dash} ${circ}`}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                            style={{ transition: "stroke-dasharray 1.2s ease" }}
                        />
                        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="#667eea">
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
                <div style={s.skillGrid}>
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
                        <p style={s.feedbackTitle}>📝 Summary</p>
                        <p style={s.feedbackText}>{report.summary}</p>
                    </div>
                )}

                {/* Strengths */}
                {report.strengths && (
                    <div style={s.feedbackBox}>
                        <p style={s.feedbackTitle}>✨ Strengths</p>
                        <p style={s.feedbackText}>{report.strengths}</p>
                    </div>
                )}

                {/* Areas to grow */}
                {report.improvements && (
                    <div style={{ ...s.feedbackBox, borderLeftColor: "#f093fb" }}>
                        <p style={{ ...s.feedbackTitle, color: "#b03ab0" }}>🌱 Areas to Grow</p>
                        <p style={s.feedbackText}>{report.improvements}</p>
                    </div>
                )}

                {/* Admission recommendation */}
                {report.recommendation && (
                    <div style={{ ...s.feedbackBox, borderLeftColor: recColor, background: "#f8fff8" }}>
                        <p style={{ ...s.feedbackTitle, color: recColor }}>📋 Admission Note</p>
                        <p style={s.feedbackText}>
                            <strong>{report.recommendation}</strong>
                            {report.admin_note && ` — ${report.admin_note}`}
                        </p>
                    </div>
                )}

                <button style={s.doneBtn} onClick={() => router.push("/")}>
                    Return to Portal
                </button>

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
        background: "linear-gradient(135deg, #11998e, #38ef7d)",
        borderRadius: "var(--radius-md) var(--radius-md) 0 0",
        padding: "2rem",
        textAlign: "center",
        color: "#fff",
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
        background: "#f8f8ff",
        borderRadius: "var(--radius-sm)",
        padding: "1rem",
        borderLeft: "4px solid #667eea",
    },
    feedbackTitle: {
        fontSize: "0.8rem",
        fontWeight: 600,
        color: "#667eea",
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
        background: "#667eea",
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
