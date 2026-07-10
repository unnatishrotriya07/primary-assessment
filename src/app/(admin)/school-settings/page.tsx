"use client";

import React, { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { STORAGE_KEYS } from "@/utils/constants";
import { controlPanelService } from "@/services/controlPanel.service";

export default function SchoolSettingsPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("SCH-DEFAULT");
  const [tenantId, setTenantId] = useState("");
  const [scholarSystem, setScholarSystem] = useState("Auto-Incrementing Integer");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    controlPanelService.getSchoolSettings()
      .then((res) => {
        if (res) {
          setSchoolName(res.name || "");
          setTenantId(res.tenant_id || "");
          setSchoolCode(res.school_code || "SCH-DEFAULT");
          setAcademicYear(res.academic_year || "2026-2027");
          setScholarSystem(res.scholar_system || "Auto-Incrementing Integer");
        }
      })
      .catch((err) => {
        console.error("Failed to load school settings from backend", err);
        if (typeof window !== "undefined") {
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              setSchoolName(parsed.schoolName || "Momentum Academy");
              setTenantId(parsed.tenantId || "Global Tenant");
              if (parsed.schoolId) {
                setSchoolCode(parsed.schoolId);
              }
            } catch (e) {}
          }
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaved(false);

    if (!schoolName.trim()) {
      setError("School Name cannot be empty.");
      return;
    }

    try {
      await controlPanelService.updateSchoolSettings({ name: schoolName.trim() });
      
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.schoolName = schoolName.trim();
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(parsed));
            
            // Trigger custom event to notify Sidebar of updates
            window.dispatchEvent(new Event("storage"));
          } catch (e) {}
        }
      }
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update school settings.");
    }
  };

  return (
    <div style={styles.container}>
      <PageHeader
        title="School Profile & Settings"
        description="Review and configure your school's global administrative details and credentials."
      />

      <div style={styles.contentWrapper}>
        <form onSubmit={handleSave} className="card" style={styles.formCard}>
          <h3 style={styles.cardTitle}>Academic Institution Info</h3>
          <p style={styles.cardDesc}>
            These settings govern the identity displays across teacher and parent access views.
          </p>

          {isSaved && (
            <div style={styles.successBanner}>
              ✓ School profile settings saved successfully!
            </div>
          )}

          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          <div style={styles.formGrid}>
            <Input
              label="School Name"
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Momentum Academy"
            />

            <div style={styles.formGroup}>
              <label style={styles.label}>School Registration Code</label>
              <input
                type="text"
                readOnly
                value={schoolCode}
                style={styles.readOnlyInput}
              />
              <span style={styles.subtext}>Used by faculty members during registration.</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>System Tenant ID</label>
              <input
                type="text"
                readOnly
                value={tenantId}
                style={styles.readOnlyInput}
              />
              <span style={styles.subtext}>System identifier for backend isolation.</span>
            </div>

            <Input
              label="Active Academic Year"
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2026-2027"
            />

            <div style={styles.formGroup}>
              <label style={styles.label}>Scholar ID Assignment Method</label>
              <select
                value={scholarSystem}
                onChange={(e) => setScholarSystem(e.target.value)}
                style={styles.select}
              >
                <option value="Auto-Incrementing Integer">Auto-Generated Integer (e.g. 10041)</option>
                <option value="Manual text entry">Manual alphanumeric Scholar ID</option>
                <option value="NCERT standard tracking">NCERT student registration index</option>
              </select>
            </div>
          </div>

          <div style={styles.actions}>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
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
  contentWrapper: {
    width: "100%",
    maxWidth: "800px",
  },
  formCard: {
    padding: "2rem",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-sm)",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
  },
  cardDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
  },
  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  readOnlyInput: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    width: "100%",
    outline: "none",
    cursor: "not-allowed",
  },
  select: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    outline: "none",
    cursor: "pointer",
  },
  subtext: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "1.5rem",
    paddingTop: "1rem",
    borderTop: "1px solid var(--divider)",
  },
  successBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 600,
    border: "1px solid rgba(22, 163, 74, 0.2)",
    marginBottom: "1.2rem",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(220, 38, 38, 0.2)",
    marginBottom: "1.2rem",
  },
};
