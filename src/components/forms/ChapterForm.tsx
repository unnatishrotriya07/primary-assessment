"use client";

import React, { useEffect, useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import subjectService from "@/services/subject.service";
import chapterService from "@/services/chapter.service";
import { SubjectData } from "@/types/subject.types";
import { extractErrorMessage, isHindiText } from "@/utils/helpers";


interface ChapterFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  defaultSubjectId?: string;
}

export default function ChapterForm({ onSuccess, onCancel, defaultSubjectId }: ChapterFormProps) {
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId || "");
  const [content, setContent] = useState("");
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploadSuccess("");
    setParsingFile(true);
    try {
      const res = await chapterService.parseFile(file);
      setContent(res.text || "");
      setUploadSuccess(`Successfully extracted text from ${file.name}!`);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to extract text from file. Please ensure it is a valid PDF or plain text file."));
    } finally {
      setParsingFile(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await subjectService.getAll();
        setSubjects(data);
      } catch (err: any) {
        console.error("Failed to load subjects for selection", err);
      }
    };
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await chapterService.create({
        title,
        number,
        subjectId: subjectId, // CamelModel on backend parses subjectId to subject_id automatically
        content: content || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create chapter."));
    } finally {
      setLoading(false);
    }
  };

  const selectedSub = subjects.find(s => String(s.id) === String(subjectId));
  const isHindi = selectedSub?.name?.toLowerCase() === "hindi" || isHindiText(title) || isHindiText(content);

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorBanner}>{error}</div>}
      <Input
        label="Chapter Title"
        placeholder="e.g. Photosynthesis and Ecosystems"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={isHindi ? "font-hindi" : ""}
        required
      />

      <div className="form-row-responsive">
        <Input
          label="Chapter Number"
          placeholder="e.g. 3"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />
        <div style={styles.selectGroup}>
          <label style={styles.label}>Link to Subject<span className="required-asterisk">*</span></label>
          <select 
            value={subjectId} 
            onChange={(e) => setSubjectId(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">Select a Subject...</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.uploadGroup}>
        <label style={styles.label}>Upload Chapter Document (PDF or .txt)</label>
        <div style={styles.uploadRow}>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            disabled={parsingFile || loading}
            style={styles.fileInput}
            id="chapter-file-upload"
          />
          <label htmlFor="chapter-file-upload" style={{
            ...styles.uploadButton,
            opacity: parsingFile || loading ? 0.6 : 1,
            cursor: parsingFile || loading ? "not-allowed" : "pointer"
          }}>
            {parsingFile ? "Extracting Text..." : "Choose File & Upload"}
          </label>
          {parsingFile && <div className="spinner" style={styles.miniSpinner}></div>}
        </div>
        {uploadSuccess && <div style={styles.successText}>{uploadSuccess}</div>}
      </div>

      <div style={styles.textareaGroup}>
        <label style={styles.label}>Chapter Reference Content (for automated question generation)</label>
        <textarea
          placeholder="Paste or write the chapter textbook content or summary here. Questions will be generated strictly based on this content."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={styles.textarea}
          className={isHindi ? "font-hindi" : ""}
        />
      </div>

      <div style={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save Chapter
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
    maxWidth: "720px",
    width: "100%",
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
    width: "100%",
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
  },
  textareaGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  textarea: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    minHeight: "120px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "0.5rem",
  },
  uploadGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
  },
  uploadRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  fileInput: {
    display: "none",
  },
  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.7rem 1.2rem",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    border: "1px dashed var(--primary)",
    fontSize: "0.9rem",
    fontWeight: 600,
    transition: "all var(--transition-fast)",
  },
  miniSpinner: {
    width: "18px",
    height: "18px",
    border: "2px solid var(--primary)",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  successText: {
    fontSize: "0.85rem",
    color: "var(--success)",
    fontWeight: 600,
    marginTop: "0.2rem",
  },
};
