import React, { useState } from "react";
import Button from "@/components/common/Button";
import studentService from "@/services/student.service";

interface TeacherNotesPanelProps {
  studentId: string;
  notes: string[];
  onNotesUpdated: (newNotes: string[]) => void;
}

export default function TeacherNotesPanel({
  studentId,
  notes,
  onNotesUpdated,
}: TeacherNotesPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      // Append the new note to the existing list
      const updatedList = [...notes, newNote.trim()];
      const notesPayload = updatedList.join("\n\n");

      // Save to database
      await studentService.update(studentId, {
        teacherNotes: notesPayload,
      });

      // Update state and clear input
      onNotesUpdated(updatedList);
      setNewNote("");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Failed to save teacher notes. Please check connections."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container} className="card">
      <div style={styles.header}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="2"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <h4 style={styles.title}>Teacher Observation Notes</h4>
      </div>

      {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

      {/* Existing Notes List */}
      <div style={styles.notesList}>
        {notes.length === 0 ? (
          <div style={styles.emptyNotes}>
            No teacher observation logs recorded yet.
          </div>
        ) : (
          notes.map((note, index) => (
            <div key={index} style={styles.noteItem}>
              <div style={styles.noteMeta}>
                <span>Observation #{index + 1}</span>
              </div>
              <p style={styles.noteText}>{note}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Add Observation Log</label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a brief observation about the student's progress, focus, or classroom behavior..."
            style={styles.textarea}
            rows={3}
            disabled={loading}
            required
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!newNote.trim() || loading}
          style={{ width: "fit-content", alignSelf: "flex-end" }}
        >
          Save Note
        </Button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  errorBanner: {
    padding: "10px",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    fontSize: "13px",
    borderRadius: "10px",
  },
  notesList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "300px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  noteItem: {
    backgroundColor: "var(--bg-app)",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
  },
  noteMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  noteText: {
    fontSize: "13.5px",
    lineHeight: "1.45",
    color: "var(--text-primary)",
    margin: 0,
  },
  emptyNotes: {
    color: "var(--text-muted)",
    fontSize: "13.5px",
    fontStyle: "italic",
    textAlign: "center",
    padding: "20px 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    borderTop: "1px solid var(--divider)",
    paddingTop: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    fontSize: "13.5px",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface)",
    transition: "border-color var(--transition-fast)",
  },
};
