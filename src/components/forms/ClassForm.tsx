"use client";

import React, { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import classService from "@/services/class.service";
import { extractErrorMessage } from "@/utils/helpers";

interface ClassFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ClassForm({ onSuccess, onCancel }: ClassFormProps) {
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await classService.create({
        name: className,
        grade,
        section,
      });
      onSuccess();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create class."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorBanner}>{error}</div>}
      <Input
        label="Class Name"
        placeholder="e.g. Grade 5 - Mathematics Elite"
        value={className}
        onChange={(e) => setClassName(e.target.value)}
        required
      />

      <div className="form-row-responsive">
        <Input
          label="Grade Level"
          placeholder="e.g. 5"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          required
        />
      </div>

      <div style={styles.actions}>
        <Button variant="secondary" onClick={onCancel} type="button" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save Class
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
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "0.5rem",
  },
};
