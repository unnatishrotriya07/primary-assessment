import React, { useState } from "react";
import { JourneyTrendData } from "@/types/student.types";

interface LearningTrendChartProps {
  trendData: JourneyTrendData[];
}

export default function LearningTrendChart({ trendData }: LearningTrendChartProps) {
  // Available metrics to toggle
  const [activeMetrics, setActiveMetrics] = useState({
    overallScore: true,
    communication: false,
    numeracy: false,
    creativity: false,
    emotionalIq: false,
  });

  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    metric: string;
    x: number;
    y: number;
    value: number;
    title: string;
    date: string;
  } | null>(null);

  if (!trendData || trendData.length === 0) {
    return (
      <div style={styles.emptyChart}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "0.8rem" }}>
          <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
        <h5>No Learning History Available</h5>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
          Complete voice assessments or report templates to begin tracking learning trends.
        </p>
      </div>
    );
  }

  // Chart configuration settings
  const width = 640;
  const height = 280;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // X coordinate mapper (spread across points)
  const getX = (index: number) => {
    if (trendData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (trendData.length - 1)) * chartWidth;
  };

  // Y coordinate mapper (invert score 0-100 to fit SVG space)
  const getY = (score: number) => {
    return paddingTop + chartHeight - (score / 100) * chartHeight;
  };

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Metrics specifications
  const metricsConfig = [
    {
      key: "overallScore" as const,
      label: "Overall Progress",
      color: "#2563EB", // Blue
      lightColor: "rgba(37, 99, 235, 0.15)",
    },
    {
      key: "numeracy" as const,
      label: "Numeracy",
      color: "#16A34A", // Green
      lightColor: "rgba(22, 163, 74, 0.15)",
    },
    {
      key: "communication" as const,
      label: "Communication",
      color: "#D97706", // Amber
      lightColor: "rgba(217, 119, 6, 0.15)",
    },
    {
      key: "creativity" as const,
      label: "Creativity",
      color: "#0EA5E9", // Info light blue
      lightColor: "rgba(14, 165, 233, 0.15)",
    },
    {
      key: "emotionalIq" as const,
      label: "Confidence & EQ",
      color: "#6B7280", // Gray
      lightColor: "rgba(107, 114, 128, 0.15)",
    },
  ];

  return (
    <div style={styles.container}>
      {/* Selector Filter checkboxes */}
      <div style={styles.legendRow}>
        {metricsConfig.map((metric) => {
          // Check if metric exists in any trend data entry
          const exists = trendData.some((d) => d[metric.key] !== undefined);
          if (!exists) return null;

          const active = activeMetrics[metric.key];
          return (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              style={{
                ...styles.legendItem,
                backgroundColor: active ? "var(--bg-surface)" : "var(--bg-app)",
                borderColor: active ? metric.color : "var(--border-color)",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              className="interactive-element"
            >
              <span
                style={{
                  ...styles.dot,
                  backgroundColor: active ? metric.color : "var(--disabled)",
                }}
              />
              {metric.label}
            </button>
          );
        })}
      </div>

      {/* SVG Canvas Area */}
      <div style={styles.chartWrapper}>
        <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
          {/* Y Axis Guide Lines */}
          {[0, 25, 50, 75, 100].map((score) => {
            const y = getY(score);
            return (
              <g key={score}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--divider)"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--text-secondary)"
                  fontWeight="500"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {/* X Axis Dates Labels */}
          {trendData.map((d, index) => {
            // Render labels for start, middle, end, or all if short
            const showLabel =
              trendData.length < 5 ||
              index === 0 ||
              index === trendData.length - 1 ||
              (trendData.length > 5 && index === Math.floor(trendData.length / 2));
            if (!showLabel) return null;

            const x = getX(index);
            return (
              <text
                key={index}
                x={x}
                y={height - paddingBottom + 18}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-secondary)"
                fontWeight="500"
              >
                {d.date}
              </text>
            );
          })}

          {/* SVG Line Paths for Active Metrics */}
          {metricsConfig.map((metric) => {
            if (!activeMetrics[metric.key]) return null;

            // Generate SVG Path coordinates
            const points = trendData
              .map((d, idx) => {
                const val = d[metric.key];
                if (val === undefined || val === null) return null;
                return `${getX(idx)},${getY(val)}`;
              })
              .filter(Boolean)
              .join(" ");

            if (!points) return null;

            return (
              <polyline
                key={metric.key}
                fill="none"
                stroke={metric.color}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            );
          })}

          {/* Data Nodes & Interaction Points */}
          {metricsConfig.map((metric) => {
            if (!activeMetrics[metric.key]) return null;

            return trendData.map((d, idx) => {
              const val = d[metric.key];
              if (val === undefined || val === null) return null;

              const x = getX(idx);
              const y = getY(val);

              return (
                <g key={`${metric.key}-${idx}`}>
                  {/* Outer circle for hover focus */}
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        index: idx,
                        metric: metric.label,
                        x,
                        y,
                        value: val,
                        title: d.assessmentTitle,
                        date: d.date,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Visual Node Dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={hoveredPoint?.index === idx && hoveredPoint?.metric === metric.label ? "6" : "4"}
                    fill="#ffffff"
                    stroke={metric.color}
                    strokeWidth="3"
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            });
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredPoint && (
          <div
            style={{
              ...styles.tooltip,
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 32}%`,
            }}
          >
            <div style={styles.tooltipTitle}>{hoveredPoint.title}</div>
            <div style={styles.tooltipRow}>
              <span style={styles.tooltipLabel}>{hoveredPoint.metric}:</span>
              <span style={styles.tooltipValue}>{hoveredPoint.value}%</span>
            </div>
            <div style={styles.tooltipDate}>{hoveredPoint.date}</div>
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
    gap: "18px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "var(--shadow-sm)",
  },
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginRight: "8px",
  },
  chartWrapper: {
    position: "relative",
    width: "100%",
  },
  svg: {
    width: "100%",
    height: "auto",
    overflow: "visible",
  },
  tooltip: {
    position: "absolute",
    transform: "translate(-50%, -100%)",
    backgroundColor: "var(--text-primary)",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "8px 12px",
    boxShadow: "var(--shadow-md)",
    zIndex: 10,
    width: "180px",
    pointerEvents: "none",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  tooltipTitle: {
    fontSize: "12px",
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tooltipRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
  },
  tooltipLabel: {
    opacity: 0.8,
  },
  tooltipValue: {
    fontWeight: 700,
  },
  tooltipDate: {
    fontSize: "10px",
    opacity: 0.6,
    textAlign: "right",
  },
  emptyChart: {
    backgroundColor: "var(--bg-surface)",
    border: "1px dashed var(--border-color)",
    borderRadius: "14px",
    padding: "48px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
};
