"use client";

import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import classService from "@/services/class.service";
import subjectService from "@/services/subject.service";
import chapterService from "@/services/chapter.service";
import questionService from "@/services/question.service";
import assessmentService, { StudentAssessmentResponse } from "@/services/assessment.service";
import studentService from "@/services/student.service";
import { ClassData } from "@/types/class.types";
import { SubjectData } from "@/types/subject.types";
import { ChapterData } from "@/types/chapter.types";
import { QuestionData } from "@/types/question.types";
import { StudentData } from "@/types/student.types";
import { extractErrorMessage } from "@/utils/helpers";

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "curriculum" | "student" | "success";

export default function CreateAssessmentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAssessmentModalProps) {
  const [step, setStep] = useState<Step>("curriculum");

  // Curriculum dropdown data
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  
  // Selected curriculum values
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [questionsToAsk, setQuestionsToAsk] = useState<number>(5);

  // Questions state
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [questionsSearch, setQuestionsSearch] = useState<string>("");
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  // Students state
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsSearch, setStudentsSearch] = useState<string>("");
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  // Student Details state
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [studentClass, setStudentClass] = useState("");

  // Submission/Error/Success states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<StudentAssessmentResponse[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedClassLink, setCopiedClassLink] = useState(false);

  // Fetch classes when modal opens
  useEffect(() => {
    let active = true;
    if (isOpen) {
      setStep("curriculum");
      setSelectedClassId("");
      setSelectedSubjectId("");
      setSelectedChapterId("");
      setQuestions([]);
      setSelectedQuestionIds([]);
      setQuestionsSearch("");
      setAssessmentTitle("");
      setStudentClass("");
      setStudents([]);
      setSelectedStudentIds([]);
      setStudentsSearch("");
      setError("");
      setSuccessData(null);
      setCopiedId(null);
      setCopiedAll(false);
      setCopiedClassLink(false);
      setSelectedSession("");
      setQuestionsToAsk(5);

      const fetchClasses = async () => {
        try {
          const res = await classService.getAll();
          if (active) {
            setClasses(res);
          }
        } catch (err) {
          console.error("Failed to fetch classes", err);
        }
      };
      fetchClasses();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Fetch subjects when class selection changes
  useEffect(() => {
    let active = true;
    if (selectedClassId) {
      const fetchSubjects = async () => {
        try {
          const res = await subjectService.getAll(selectedClassId);
          if (active) {
            setSubjects(res);
            setSelectedSubjectId("");
            setChapters([]);
            setSelectedChapterId("");
            setSelectedSession("");
            setQuestions([]);
            setSelectedQuestionIds([]);
          }
        } catch (err) {
          console.error("Failed to fetch subjects", err);
        }
      };
      fetchSubjects();

      // Prefill student class field
      const matchedClass = classes.find(c => String(c.id) === selectedClassId);
      if (matchedClass && active) {
        setStudentClass(`${matchedClass.name || ""} ${matchedClass.section || ""}`.trim());
      }
    } else {
      setSubjects([]);
      setSelectedSubjectId("");
      setChapters([]);
      setSelectedChapterId("");
      setSelectedSession("");
      setQuestions([]);
      setSelectedQuestionIds([]);
    }
    return () => {
      active = false;
    };
  }, [selectedClassId, classes]);

  // Fetch students when class selection changes
  useEffect(() => {
    let active = true;
    if (selectedClassId) {
      const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
          const res = await studentService.getByClass(selectedClassId);
          if (active) {
            setStudents(res);
            // Default select all students
            setSelectedStudentIds(res.map(s => Number(s.id)));
          }
        } catch (err) {
          console.error("Failed to fetch students", err);
        } finally {
          if (active) {
            setLoadingStudents(false);
          }
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudentIds([]);
    }
    return () => {
      active = false;
    };
  }, [selectedClassId]);

  // Fetch chapters when subject selection changes
  useEffect(() => {
    let active = true;
    if (selectedSubjectId) {
      const fetchChapters = async () => {
        try {
          const res = await chapterService.getBySubject(selectedSubjectId);
          if (active) {
            setChapters(res);
            setSelectedChapterId("");
            setSelectedSession("");
          }
        } catch (err) {
          console.error("Failed to fetch chapters", err);
        }
      };
      fetchChapters();

      // Prefill assessment title
      const matchedSubject = subjects.find(s => String(s.id) === selectedSubjectId);
      if (matchedSubject && active) {
        setAssessmentTitle(`${matchedSubject.name || ""} Assessment`);
      }
    } else {
      setChapters([]);
      setSelectedChapterId("");
      setSelectedSession("");
    }
    return () => {
      active = false;
    };
  }, [selectedSubjectId, subjects]);

  // Fetch questions when Class, Subject or Chapter changes
  useEffect(() => {
    let active = true;
    if (selectedClassId && selectedSubjectId) {
      const fetchQuestions = async () => {
        setLoadingQuestions(true);
        setError("");
        try {
          const res = await questionService.getAll({
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            chapterId: selectedChapterId || undefined,
          });
          if (!active) return;
          setQuestions(res);
          // Keep only selected questions that still exist in the retrieved list
          const resIds = res.map(q => Number(q.id));
          setSelectedQuestionIds(prev => prev.filter(id => resIds.includes(id)));
        } catch (err: any) {
          if (!active) return;
          setError(extractErrorMessage(err, "Failed to load questions from database."));
        } finally {
          if (active) {
            setLoadingQuestions(false);
          }
        }
      };
      fetchQuestions();
    } else {
      setQuestions([]);
      setSelectedQuestionIds([]);
    }
    return () => {
      active = false;
    };
  }, [selectedClassId, selectedSubjectId, selectedChapterId]);

  const handleSessionChange = (sessionValue: string) => {
    setSelectedSession(sessionValue);
    if (sessionValue) {
      const sessionQuestions = questions.filter(q => q.session === sessionValue);
      const sessionQuestionIds = sessionQuestions.map(q => Number(q.id));
      setSelectedQuestionIds(sessionQuestionIds);
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(questionsSearch.toLowerCase());
    const matchesSession = !selectedSession || q.session === selectedSession;
    return matchesSearch && matchesSession;
  });

  const handleToggleQuestion = (id: number) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredQuestions.map(q => Number(q.id));
    setSelectedQuestionIds(prev => {
      // Find visible ids not already selected, and append them
      const newSelections = visibleIds.filter(id => !prev.includes(id));
      return [...prev, ...newSelections];
    });
  };

  const handleDeselectAll = () => {
    const visibleIds = filteredQuestions.map(q => Number(q.id));
    setSelectedQuestionIds(prev => prev.filter(id => !visibleIds.includes(id)));
  };

  const handleNextStep = () => {
    if (selectedQuestionIds.length === 0) {
      setError("Please select at least one question for the assessment.");
      return;
    }
    setError("");
    setStep("student");

    // Dynamic Title Update based on selection
    const matchedSubject = subjects.find(s => String(s.id) === selectedSubjectId);
    const subjectPrefix = matchedSubject ? matchedSubject.name : "Custom";
    setAssessmentTitle(`${subjectPrefix} - Custom Quiz (${selectedQuestionIds.length} Qs)`);
  };

  const handleCopyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handleCopyAllLinks = async () => {
    if (!successData) return;
    try {
      const allLinks = successData
        .map(sa => `${sa.studentName}: ${sa.assessmentLink}`)
        .join("\n");
      await navigator.clipboard.writeText(allLinks);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy all links", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!(assessmentTitle || "").trim()) {
      setError("Assessment Title is required.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      setError("Please select at least one student to assign the assessment.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create custom Assessment linked to selected questions
      const todayStr = new Date().toISOString().split("T")[0];
      const createdAssessment = await assessmentService.create({
        title: (assessmentTitle || "").trim(),
        subjectId: Number(selectedSubjectId),
        classId: Number(selectedClassId),
        status: "Active",
        date: todayStr,
        questionsCount: selectedQuestionIds.length,
        questionIds: selectedQuestionIds,
        questionsToAsk: questionsToAsk,
      });

      // 2. Assign to multiple Students in bulk
      const res = await assessmentService.assignAssessmentBulk({
        assessmentId: Number(createdAssessment.id),
        studentIds: selectedStudentIds,
      });

      setSuccessData(res);
      setStep("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create and assign assessment."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === "curriculum" ? "Step 1: Select Questions" :
        step === "student" ? "Step 2: Select Students & Configure Title" :
        "Assessment Assigned Successfully"
      }
      size={step === "curriculum" || step === "student" ? "large" : "medium"}
    >
      {step === "curriculum" && (
        <div style={styles.container}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* Curriculum dropdown row */}
          <div style={styles.dropdownRow}>
            <div style={styles.selectWrapper}>
              <label style={styles.selectLabel}>Select Class *</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Choose Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.selectWrapper}>
              <label style={styles.selectLabel}>Select Subject *</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId}
                style={styles.select}
              >
                <option value="">-- Choose Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.selectWrapper}>
              <label style={styles.selectLabel}>Select Chapter (Optional)</label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                disabled={!selectedSubjectId}
                style={styles.select}
              >
                <option value="">All Chapters</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Chapter {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.selectWrapper}>
              <label style={styles.selectLabel}>Select Session (Optional)</label>
              <select
                value={selectedSession}
                onChange={(e) => handleSessionChange(e.target.value)}
                disabled={!selectedSubjectId}
                style={styles.select}
              >
                <option value="">All Sessions</option>
                {Array.from(new Set(questions.map((q) => q.session).filter(Boolean))).map((session) => (
                  <option key={session as string} value={session as string}>
                    {session as string}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question List Section */}
          <div style={styles.questionSection}>
            <div style={styles.questionHeaderBar}>
              <div style={styles.questionCountText}>
                {selectedClassId && selectedSubjectId ? (
                  <>
                    Available Questions ({filteredQuestions.length}) |{" "}
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                      {selectedQuestionIds.length} Selected
                    </span>
                  </>
                ) : (
                  "Choose a Class and Subject to see questions"
                )}
              </div>

              {selectedClassId && selectedSubjectId && questions.length > 0 && (
                <div style={styles.searchAndBatchActions}>
                  <input
                    type="text"
                    placeholder="Search visible questions..."
                    value={questionsSearch}
                    onChange={(e) => setQuestionsSearch(e.target.value)}
                    style={styles.searchInput}
                  />
                  <button onClick={handleSelectAll} style={styles.textLinkButton} type="button">
                    Select All Visible
                  </button>
                  <span style={{ color: "var(--border-color)" }}>|</span>
                  <button onClick={handleDeselectAll} style={styles.textLinkButton} type="button">
                    Deselect All Visible
                  </button>
                </div>
              )}
            </div>

            <div style={styles.questionsContainer}>
              {loadingQuestions ? (
                <div style={styles.emptyState}>
                  <div className="spinner" style={{ marginBottom: "1rem" }}></div>
                  Loading questions from database...
                </div>
              ) : !selectedClassId || !selectedSubjectId ? (
                <div style={styles.emptyState}>
                  Please choose a Class and a Subject to retrieve questions from the database.
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div style={styles.emptyState}>
                  No questions match your curriculum or search criteria in the database.
                </div>
              ) : (
                <div style={styles.questionsList}>
                  {filteredQuestions.map((q) => {
                    const isChecked = selectedQuestionIds.includes(Number(q.id));
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestion(Number(q.id))}
                        style={{
                          ...styles.questionCard,
                          borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                          backgroundColor: isChecked ? "var(--primary-light)" : "var(--bg-card)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by card onClick
                          style={styles.checkbox}
                        />
                        <div style={styles.questionCardContent}>
                          <div style={styles.questionText}>{q.text}</div>
                          <div style={styles.badgeRow}>
                            <span
                              style={{
                                ...styles.badge,
                                backgroundColor:
                                  q.difficulty === "easy" ? "var(--success-light)" :
                                  q.difficulty === "medium" ? "var(--warning-light)" : "var(--error-light)",
                                color:
                                  q.difficulty === "easy" ? "var(--success)" :
                                  q.difficulty === "medium" ? "var(--warning)" : "var(--error)",
                              }}
                            >
                              {q.difficulty}
                            </span>
                            <span style={{ ...styles.badge, backgroundColor: "var(--bg-surface-hover)", color: "var(--text-secondary)" }}>
                              {q.cognitiveLevel}
                            </span>
                            {q.options && q.options.length > 0 ? (
                              <span style={{ ...styles.badge, backgroundColor: "var(--bg-surface-hover)", color: "var(--text-muted)" }}>
                                MCQ ({q.options.length} options)
                              </span>
                            ) : (
                              <span style={{ ...styles.badge, backgroundColor: "var(--bg-surface-hover)", color: "var(--text-muted)" }}>
                                Descriptive / Math
                              </span>
                            )}
                            {q.session && (
                              <span style={{ ...styles.badge, backgroundColor: "var(--primary-light)", color: "var(--primary)", fontWeight: 700 }}>
                                {q.session}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={styles.actions}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button onClick={handleNextStep} disabled={selectedQuestionIds.length === 0}>
              Next: Select Students
            </Button>
          </div>
        </div>
      )}

      {step === "student" && (
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={styles.sectionHeader}>Assessment Settings</div>
          
          <Input
            label="Assessment Title"
            placeholder="e.g. Science - Chapter 1 Diagnostic"
            value={assessmentTitle}
            onChange={(e) => setAssessmentTitle(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Questions to Ask Each Student (5 to 10)"
            type="number"
            min={5}
            max={10}
            value={questionsToAsk}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setQuestionsToAsk(val);
              }
            }}
            required
            disabled={loading}
          />

          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "-0.5rem" }}>
            This custom assessment includes <strong>{selectedQuestionIds.length} manually selected questions</strong>.
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: "0.5rem" }}>
            Select Students ({selectedStudentIds.length} Selected)
          </div>

          <div style={styles.studentControlsRow}>
            <input
              type="text"
              placeholder="Search students by name, email, or scholar ID..."
              value={studentsSearch}
              onChange={(e) => setStudentsSearch(e.target.value)}
              style={styles.studentSearchInput}
            />
            <div style={styles.studentBatchActions}>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = students
                    .filter(s => {
                      const query = studentsSearch.toLowerCase();
                      return (
                        s.name.toLowerCase().includes(query) ||
                        s.email.toLowerCase().includes(query) ||
                        s.scholarNumber.toLowerCase().includes(query)
                      );
                    })
                    .map(s => Number(s.id));
                  setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                }}
                style={styles.textLinkButton}
              >
                Select All Matching
              </button>
              <span style={{ color: "var(--border-color)" }}>|</span>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = students
                    .filter(s => {
                      const query = studentsSearch.toLowerCase();
                      return (
                        s.name.toLowerCase().includes(query) ||
                        s.email.toLowerCase().includes(query) ||
                        s.scholarNumber.toLowerCase().includes(query)
                      );
                    })
                    .map(s => Number(s.id));
                  setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
                }}
                style={styles.textLinkButton}
              >
                Deselect All Matching
              </button>
            </div>
          </div>

          <div style={styles.studentListContainer}>
            {loadingStudents ? (
              <div style={styles.emptyState}>
                <div className="spinner" style={{ marginBottom: "1rem" }}></div>
                Loading student records...
              </div>
            ) : students.length === 0 ? (
              <div style={styles.emptyState}>
                No students found in this class. Please upload students first.
              </div>
            ) : (
              <div style={styles.studentGrid}>
                {students
                  .filter(s => {
                    const query = studentsSearch.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(query) ||
                      s.email.toLowerCase().includes(query) ||
                      s.scholarNumber.toLowerCase().includes(query)
                    );
                  })
                  .map(s => {
                    const isChecked = selectedStudentIds.includes(Number(s.id));
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          const idNum = Number(s.id);
                          setSelectedStudentIds(prev =>
                            prev.includes(idNum)
                              ? prev.filter(id => id !== idNum)
                              : [...prev, idNum]
                          );
                        }}
                        style={{
                          ...styles.studentCard,
                          borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                          backgroundColor: isChecked ? "var(--primary-light)" : "var(--bg-card)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by card onClick
                          style={styles.checkbox}
                        />
                        {s.pictureUrl ? (
                          <img
                            src={s.pictureUrl}
                            alt={s.name}
                            style={styles.studentAvatar}
                          />
                        ) : (
                          <div style={styles.studentAvatarInitials}>
                            {s.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                        <div style={styles.studentCardInfo}>
                          <div style={styles.studentName}>{s.name}</div>
                          <div style={styles.studentEmail}>{s.email}</div>
                          <div style={styles.studentScholar}>Scholar ID: {s.scholarNumber}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <Button variant="secondary" onClick={() => setStep("curriculum")} type="button" disabled={loading}>
              Back to Selection
            </Button>
            <Button type="submit" loading={loading} disabled={selectedStudentIds.length === 0}>
              Create & Assign ({selectedStudentIds.length})
            </Button>
          </div>
        </form>
      )}

      {step === "success" && successData && (
        <div style={styles.successContainer} className="animate-fade-in">
          <div style={styles.successHeader}>
            <div style={styles.successIcon}>✓</div>
            <h4 style={styles.successTitle}>Assessment Assigned Successfully!</h4>
            <p style={styles.successSubtitle}>
              Simulated invitation emails have been generated and dispatched to {successData.length} students.
            </p>
          </div>

          <div style={styles.bulkAssignSummary}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Class</span>
              <span style={styles.summaryValue}>{successData[0]?.studentClass || studentClass}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Assigned Students</span>
              <span style={styles.summaryValue}>{successData.length}</span>
            </div>
            <div style={{ ...styles.summaryItem, gridColumn: "span 2" }}>
              <Button
                onClick={handleCopyAllLinks}
                variant={copiedAll ? "success" : "primary"}
                style={{ width: "100%", fontSize: "0.85rem", height: "38px" }}
              >
                {copiedAll ? "All Links Copied!" : "📋 Copy All Invitation Links"}
              </Button>
            </div>
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: "0.5rem" }}>
            Class Shareable Link (All Students)
          </div>
          <div style={styles.shareableLinkWrapper}>
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/assessment/join?id=${successData[0]?.assessmentId}`}
              style={styles.shareableLinkInput}
            />
            <Button
              onClick={async () => {
                try {
                  const link = `${window.location.origin}/assessment/join?id=${successData[0]?.assessmentId}`;
                  await navigator.clipboard.writeText(link);
                  setCopiedClassLink(true);
                  setTimeout(() => setCopiedClassLink(false), 2000);
                } catch (err) {
                  console.error("Failed to copy link", err);
                }
              }}
              variant={copiedClassLink ? "success" : "primary"}
              style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", minWidth: "90px", height: "43px" }}
              type="button"
            >
              {copiedClassLink ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          <div style={{ ...styles.sectionHeader, marginTop: "0.5rem" }}>
            Student Access Links
          </div>

          <div style={styles.linksTableContainer}>
            <table style={styles.linksTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Assessment URL / Action</th>
                </tr>
              </thead>
              <tbody>
                {successData.map((sa) => {
                  const isCopied = copiedId === String(sa.id);
                  return (
                    <tr key={sa.id} style={styles.tableRow}>
                      <td style={styles.td}><strong>{sa.studentName}</strong></td>
                      <td style={styles.td}>{sa.studentEmail}</td>
                      <td style={styles.td}>
                        <div style={styles.rowCopyWrapper}>
                          <input
                            type="text"
                            readOnly
                            value={sa.assessmentLink}
                            style={styles.tableLinkInput}
                          />
                          <Button
                            onClick={() => handleCopyLink(sa.assessmentLink, String(sa.id))}
                            variant={isCopied ? "success" : "primary"}
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", minWidth: "65px", height: "28px" }}
                          >
                            {isCopied ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={styles.successActions}>
            <Button onClick={onClose} variant="secondary" style={{ width: "100%" }}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    maxHeight: "80vh",
    width: "100%",
  },
  dropdownRow: {
    display: "flex",
    gap: "1rem",
    width: "100%",
  },
  selectWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    flex: 1,
  },
  selectLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  select: {
    padding: "0.7rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    cursor: "pointer",
  },
  questionSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1rem",
    backgroundColor: "var(--bg-card)",
    flex: 1,
    minHeight: "260px",
  },
  questionHeaderBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.8rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.8rem",
  },
  questionCountText: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  searchAndBatchActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  searchInput: {
    padding: "0.4rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    width: "180px",
  },
  textLinkButton: {
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    transition: "opacity var(--transition-fast)",
  },
  questionsContainer: {
    maxHeight: "300px",
    overflowY: "auto",
    width: "100%",
    paddingRight: "0.2rem",
  },
  questionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  questionCard: {
    display: "flex",
    gap: "0.8rem",
    alignItems: "flex-start",
    padding: "0.8rem 1rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  checkbox: {
    marginTop: "0.25rem",
    cursor: "pointer",
    pointerEvents: "none",
  },
  questionCardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    flex: 1,
  },
  questionText: {
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    fontWeight: 500,
    lineHeight: "1.4",
  },
  badgeRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    padding: "0.1rem 0.5rem",
    borderRadius: "9999px",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    padding: "3rem 1rem",
    width: "100%",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "80vh",
    overflowY: "auto",
    paddingRight: "0.3rem",
    width: "100%",
  },
  sectionHeader: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--primary)",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.3rem",
    marginTop: "0.5rem",
  },
  errorBanner: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--error-light)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(239, 68, 68, 0.2)",
    width: "100%",
  },
  row: {
    display: "flex",
    gap: "1rem",
  },
  dobWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
  },
  dobLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  dateInput: {
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
    marginTop: "1rem",
    borderTop: "1px solid var(--border-color)",
    paddingTop: "1rem",
    width: "100%",
  },
  successContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "100%",
  },
  successHeader: {
    textAlign: "center",
    padding: "0.5rem 0",
  },
  successIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: "0 auto 0.8rem",
  },
  successTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.4rem",
  },
  successSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.8rem",
    backgroundColor: "var(--bg-surface-hover)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    width: "100%",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  detailLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  detailValue: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    display: "block",
    marginBottom: "0.4rem",
  },
  linkContainer: {
    width: "100%",
  },
  linkInputWrapper: {
    display: "flex",
    width: "100%",
  },
  linkInput: {
    flex: 1,
    padding: "0.7rem 1rem",
    border: "1px solid var(--border-color)",
    borderRight: "none",
    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
  },
  emailPreviewContainer: {
    width: "100%",
  },
  emailPreview: {
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    fontSize: "0.8rem",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    maxHeight: "150px",
    overflowY: "auto",
  },
  successActions: {
    marginTop: "0.5rem",
    width: "100%",
  },
  studentControlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    width: "100%",
  },
  studentSearchInput: {
    padding: "0.6rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    flex: 1,
  },
  studentBatchActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  studentListContainer: {
    maxHeight: "320px",
    overflowY: "auto",
    width: "100%",
    paddingRight: "0.2rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "1rem",
    backgroundColor: "var(--bg-card)",
  },
  studentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
    width: "100%",
  },
  studentCard: {
    display: "flex",
    gap: "0.8rem",
    alignItems: "center",
    padding: "0.8rem 1rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  studentAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  studentAvatarInitials: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9rem",
    fontWeight: 700,
  },
  studentCardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  studentEmail: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  studentScholar: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  bulkAssignSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.8rem",
    backgroundColor: "var(--bg-surface-hover)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    width: "100%",
    alignItems: "center",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  summaryLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  linksTableContainer: {
    maxHeight: "250px",
    overflowY: "auto",
    width: "100%",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
  },
  linksTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
    textAlign: "left",
  },
  th: {
    padding: "0.6rem 0.8rem",
    backgroundColor: "var(--bg-surface-hover)",
    borderBottom: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  td: {
    padding: "0.6rem 0.8rem",
    borderBottom: "1px solid var(--border-color)",
    verticalAlign: "middle",
  },
  tableRow: {
    transition: "background-color var(--transition-fast)",
    backgroundColor: "var(--bg-card)",
  },
  rowCopyWrapper: {
    display: "flex",
    gap: "0.4rem",
    alignItems: "center",
    width: "100%",
  },
  tableLinkInput: {
    flex: 1,
    padding: "0.3rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-secondary)",
    fontSize: "0.75rem",
    outline: "none",
    textOverflow: "ellipsis",
  },
  shareableLinkWrapper: {
    display: "flex",
    width: "100%",
    marginBottom: "1rem",
  },
  shareableLinkInput: {
    flex: 1,
    padding: "0.7rem 1rem",
    border: "1px solid var(--border-color)",
    borderRight: "none",
    borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
  },
};
