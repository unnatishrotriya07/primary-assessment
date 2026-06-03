import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import QuestionsTable from "@/components/tables/QuestionsTable";

export default function QuestionsPage() {
  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <PageHeader 
          title="Question Bank" 
          description="Browse, filter, and inspect existing assessment questions, or use AI to generate new ones."
        />
        <Link href="/questions/generate" style={styles.btnLink} className="interactive-element">
          Generate with AI
        </Link>
      </div>

      <div style={styles.content}>
        <QuestionsTable />
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    padding: "0.6rem 1.2rem",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "var(--shadow-sm)",
  },
  content: {
    width: "100%",
  },
};
