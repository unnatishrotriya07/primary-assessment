import PageHeader from "@/components/common/PageHeader";
import QuestionGeneratorForm from "@/components/forms/QuestionGeneratorForm";

export default function QuestionGeneratePage() {
  return (
    <div style={styles.container}>
      <PageHeader 
        title="AI Question Generator" 
        description="Configure topic, difficulty, cognitive level, and generate classroom-ready questions using AI."
      />

      <div className="glass-panel" style={styles.formContainer}>
        <QuestionGeneratorForm />
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
  formContainer: {
    padding: "2rem",
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
  },
};
