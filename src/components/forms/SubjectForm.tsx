import React, { useState, useEffect } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import subjectService from "@/services/subject.service";
import classService from "@/services/class.service";
import { ClassData } from "@/types/class.types";
import { extractErrorMessage } from "@/utils/helpers";

interface SubjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  defaultClassId?: string;
}

export default function SubjectForm({ onSuccess, onCancel, defaultClassId }: SubjectFormProps) {
  const [subjectName, setSubjectName] = useState("");
  const [code, setCode] = useState("");
  const [classId, setClassId] = useState(defaultClassId || "");
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await classService.getAll();
        setClasses(data);
      } catch (err: any) {
        console.error("Failed to load classes", err);
      }
    };
    loadClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await subjectService.create({
        name: subjectName,
        code,
        classId,
        status: "Active",
      });
      onSuccess();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create subject."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorBanner}>{error}</div>}
      
      <div style={styles.selectGroup}>
        <label style={styles.label}>Class</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          style={styles.select}
          required
        >
          <option value="">Select a Class...</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} (Grade {cls.grade}-{cls.section})
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Subject Name"
        placeholder="e.g. Science & Environment"
        value={subjectName}
        onChange={(e) => setSubjectName(e.target.value)}
        required
      />

      <Input
        label="Subject Code"
        placeholder="e.g. SCI-101"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />

      <div style={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save Subject
        </Button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  selectGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  select: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "0.5rem",
  },
};
