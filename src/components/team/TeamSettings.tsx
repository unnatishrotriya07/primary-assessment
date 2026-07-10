"use client";

import React, { useEffect, useState } from "react";
import teamService, { TeamUser } from "@/services/team.service";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import { extractErrorMessage } from "@/utils/helpers";

const APP_FEATURES = [
  { key: "dashboard", label: "Today" },
  { key: "classes", label: "Classes" },
  { key: "subjects", label: "Subjects" },
  { key: "chapters", label: "Chapters" },
  { key: "questions", label: "Saved Questions" },
  { key: "assessments", label: "Assessments" },
  { key: "reports", label: "Learning Insights" },
  { key: "students", label: "Students" },
];

export default function TeamSettings() {
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [activeDirectorId, setActiveDirectorId] = useState<number | null>(null);
  const [hoveredDirectorId, setHoveredDirectorId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [allowedFeatures, setAllowedFeatures] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await teamService.getAll();
      setTeam(data);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to load team members."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("teacher");
    setAllowedFeatures(["dashboard"]); // default dashboard permission
    setFormError("");
    setIsEdit(false);
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: TeamUser) => {
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setAllowedFeatures(user.allowedFeatures || []);
    setFormError("");
    setIsEdit(true);
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleToggleFeature = (featureKey: string) => {
    setAllowedFeatures((prev) =>
      prev.includes(featureKey)
        ? prev.filter((k) => k !== featureKey)
        : [...prev, featureKey]
    );
  };

  const handleSelectAllFeatures = () => {
    if (allowedFeatures.length === APP_FEATURES.length) {
      setAllowedFeatures([]);
    } else {
      setAllowedFeatures(APP_FEATURES.map((f) => f.key));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!isEdit && (!email || !password))) {
      setFormError("Please fill in all required fields.");
      return;
    }
    setFormError("");
    setFormLoading(true);

    try {
      if (isEdit && selectedUser) {
        await teamService.update(selectedUser.id, {
          name,
          role,
          allowedFeatures,
          password: password.trim() ? password : undefined,
        });
      } else {
        await teamService.create({
          name,
          email,
          password,
          role,
          allowedFeatures,
        });
      }
      setModalOpen(false);
      fetchTeam();
    } catch (err: any) {
      setFormError(extractErrorMessage(err, "Failed to save team member details."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this team member? This action is permanent.")) return;
    try {
      await teamService.delete(id);
      fetchTeam();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete team member.");
    }
  };

  const getRoleLabel = (roleStr: string) => {
    switch (roleStr) {
      case "admin":
        return "Admin";
      case "director":
        return "Director";
      case "teacher":
        return "Teacher";
      default:
        return roleStr;
    }
  };

  const getRoleBadgeStyle = (roleStr: string): React.CSSProperties => {
    switch (roleStr) {
      case "admin":
        return { backgroundColor: "var(--error-light)", color: "var(--error)" };
      case "director":
        return { backgroundColor: "var(--primary-light)", color: "var(--primary)" };
      case "teacher":
      default:
        return { backgroundColor: "var(--secondary-light)", color: "var(--secondary)" };
    }
  };

  const renderPermissions = (features: string[], isMini: boolean = false) => {
    if (!features || features.length === 0) {
      return <span style={{ color: "var(--text-muted)", fontSize: isMini ? "0.75rem" : "0.85rem" }}>No Permissions Granted</span>;
    }
    if (features.length === APP_FEATURES.length) {
      return (
        <span style={{ 
          ...styles.featureBadgeGlobal, 
          fontSize: isMini ? "0.75rem" : "0.8rem", 
          padding: isMini ? "0.1rem 0.4rem" : "0.2rem 0.6rem" 
        }}>
          Full Access
        </span>
      );
    }
    
    const maxToShow = 3;
    const shownFeatures = features.slice(0, maxToShow);
    const remainingCount = features.length - maxToShow;
    const fullListText = features.map(f => APP_FEATURES.find(af => af.key === f)?.label || f).join(", ");
    
    return (
      <div style={styles.featureGrid} title={fullListText}>
        {shownFeatures.map((feat) => {
          const label = APP_FEATURES.find((f) => f.key === feat)?.label || feat;
          return (
            <span 
              key={feat} 
              style={{ 
                ...styles.featureBadge, 
                fontSize: isMini ? "0.7rem" : "0.75rem", 
                padding: isMini ? "0.1rem 0.4rem" : "0.2rem 0.5rem" 
              }}
            >
              {label}
            </span>
          );
        })}
        {remainingCount > 0 && (
          <span 
            style={{
              ...styles.featureBadge,
              backgroundColor: "var(--bg-app)",
              color: "var(--text-secondary)",
              fontSize: isMini ? "0.7rem" : "0.75rem", 
              padding: isMini ? "0.1rem 0.4rem" : "0.2rem 0.5rem",
              cursor: "help",
              borderStyle: "dashed"
            }}
            title={fullListText}
          >
            +{remainingCount} more
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }}></div>
        Loading Team...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="Role Management & Team"
        description="Configure fine-grained roles and access permissions for your school's faculty."
        action={
          <Button onClick={handleOpenAdd} variant="primary">
            + Add Team Member
          </Button>
        }
      />

      {error && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      <div style={styles.tableWrapper} className="card">
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Granular Permissions</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 ? (
              <tr style={styles.row}>
                <td colSpan={5} style={{ ...styles.td, textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  No team members added yet. Click "+ Add Team Member" to invite staff.
                </td>
              </tr>
            ) : (
              (() => {
                const directors = team.filter(m => m.role === "director");
                const mainMembers = team.filter(member => {
                  if (member.role === "admin" || member.role === "director") return true;
                  if (member.role === "teacher") {
                    const hasDirector = directors.some(d => d.tenantId === member.tenantId);
                    return !hasDirector;
                  }
                  return true;
                });

                return mainMembers.map((member) => {
                  const isExpanded = activeDirectorId === member.id || hoveredDirectorId === member.id;
                  const schoolTeachers = team.filter(t => t.role === "teacher" && t.tenantId === member.tenantId);

                  return (
                    <React.Fragment key={member.id}>
                      <tr 
                        style={{
                          ...styles.row,
                          cursor: member.role === "director" ? "pointer" : "default",
                          backgroundColor: isExpanded ? "var(--bg-surface-hover)" : undefined,
                          transition: "background-color 0.2s"
                        }}
                        onClick={() => {
                          if (member.role === "director") {
                            setActiveDirectorId(activeDirectorId === member.id ? null : member.id);
                          }
                        }}
                        onMouseEnter={() => {
                          if (member.role === "director") {
                            setHoveredDirectorId(member.id);
                          }
                        }}
                        onMouseLeave={() => {
                          if (member.role === "director") {
                            setHoveredDirectorId(null);
                          }
                        }}
                      >
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {member.role === "director" && (
                              <span style={{ 
                                color: "var(--text-muted)", 
                                display: "inline-flex", 
                                transition: "transform 0.2s",
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)"
                              }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </span>
                            )}
                            <strong>{member.name}</strong>
                          </div>
                        </td>
                        <td style={styles.td}>{member.email}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...getRoleBadgeStyle(member.role) }}>
                            {getRoleLabel(member.role)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {member.role === "admin" ? (
                            <span style={styles.featureBadgeGlobal}>All Features Allowed</span>
                          ) : (
                            renderPermissions(member.allowedFeatures || [])
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(member);
                              }}
                              style={styles.actionBtn}
                              title="Edit Role & Permissions"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            {member.role !== "admin" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(member.id);
                                }}
                                style={styles.deleteBtn}
                                title="Remove Member"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {member.role === "director" && isExpanded && (
                        <tr style={{ backgroundColor: "var(--bg-app)" }}>
                          <td colSpan={5} style={{ padding: "0.5rem 1.5rem 1rem 3rem", borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{
                              borderLeft: "3px solid var(--primary)",
                              backgroundColor: "#FFFFFF",
                              borderRadius: "10px",
                              boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                              border: "1px solid var(--border-color)",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                padding: "0.75rem 1rem",
                                borderBottom: "1px solid var(--border-color)",
                                backgroundColor: "var(--bg-surface-hover)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                  School Teachers ({schoolTeachers.length})
                                </span>
                              </div>
                              {schoolTeachers.length === 0 ? (
                                <div style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                  No teachers assigned to this school yet.
                                </div>
                              ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <tbody>
                                    {schoolTeachers.map((teacher) => (
                                      <tr key={teacher.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", width: "25%" }}>
                                          <strong>{teacher.name}</strong>
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", color: "var(--text-secondary)", width: "30%" }}>
                                          {teacher.email}
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", width: "15%" }}>
                                          <span style={{ ...styles.badge, backgroundColor: "var(--secondary-light)", color: "var(--secondary)", fontSize: "0.7rem" }}>
                                            Teacher
                                          </span>
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem" }}>
                                          {renderPermissions(teacher.allowedFeatures || [], true)}
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", width: "10%" }}>
                                          <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(teacher);
                                              }}
                                              style={styles.actionBtn}
                                              title="Edit Permissions"
                                            >
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(teacher.id);
                                              }}
                                              style={styles.deleteBtn}
                                              title="Remove Teacher"
                                            >
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                              </svg>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEdit ? "Edit Team Member Settings" : "Add New Team Member"}
      >
        <form onSubmit={handleSubmit} style={styles.form}>
          {formError && (
            <div style={styles.modalError}>{formError}</div>
          )}

          <Input
            label="Name"
            type="text"
            required
            placeholder="Faculty Member's Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={formLoading}
          />

          {!isEdit && (
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="faculty@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formLoading}
            />
          )}

          <Input
            label={isEdit ? "New Password (Optional)" : "Password"}
            type="password"
            required={!isEdit}
            placeholder={isEdit ? "Leave blank to keep current password" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={formLoading}
          />

          <div style={styles.formGroup}>
            <label style={styles.label}>Assign Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.select}
              disabled={formLoading}
            >
              <option value="teacher">Teacher (Faculty member)</option>
              <option value="director">Director (School manager)</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <div style={styles.checklistHeader}>
              <label style={styles.label}>Granular Functionality Permissions</label>
              <button
                type="button"
                onClick={handleSelectAllFeatures}
                style={styles.selectAllBtn}
              >
                {allowedFeatures.length === APP_FEATURES.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div style={styles.featuresChecklist}>
              {APP_FEATURES.map((feat) => {
                const isChecked = allowedFeatures.includes(feat.key);
                return (
                  <label key={feat.key} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleFeature(feat.key)}
                      style={styles.checkbox}
                      disabled={formLoading}
                    />
                    <span>{feat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={formLoading}
            >
              {isEdit ? "Save Changes" : "Create Member"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  tableWrapper: {
    padding: 0,
    overflowX: "auto",
    border: "1px solid var(--border-color)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  headerRow: {
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
  },
  th: {
    padding: "1rem 1.5rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  row: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "1rem 1.5rem",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-flex",
    padding: "0.2rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  featureBadgeGlobal: {
    display: "inline-flex",
    padding: "0.2rem 0.6rem",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  featureGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
  },
  featureBadge: {
    display: "inline-flex",
    padding: "0.2rem 0.5rem",
    backgroundColor: "var(--bg-surface-hover)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.75rem",
    fontWeight: 500,
  },
  actionBtn: {
    color: "var(--primary)",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  deleteBtn: {
    color: "var(--error)",
    cursor: "pointer",
    border: "none",
    background: "none",
    padding: "0.3rem",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
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
  select: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  },
  checklistHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectAllBtn: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  featuresChecklist: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.8rem",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-card)",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  modalError: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "1rem",
  },
};
