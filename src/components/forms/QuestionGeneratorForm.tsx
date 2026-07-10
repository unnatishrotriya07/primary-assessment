"use client";

import React, { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import classService from "@/services/class.service";
import subjectService from "@/services/subject.service";
import chapterService from "@/services/chapter.service";
import questionService from "@/services/question.service";
import { ClassData } from "@/types/class.types";
import { SubjectData } from "@/types/subject.types";
import { ChapterData } from "@/types/chapter.types";
import { QuestionData } from "@/types/question.types";
import CreateAndAssignModal from "./CreateAndAssignModal";
import { extractErrorMessage, formatClassName } from "@/utils/helpers";

const generateDefaultSessionName = (subjectName?: string, chapterNumber?: string, chapterTitle?: string) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = [];
  if (subjectName) parts.push(subjectName);
  if (chapterNumber && chapterTitle) {
    parts.push(`Ch ${chapterNumber}: ${chapterTitle}`);
  }
  parts.push(`${dateStr} ${timeStr}`);
  return parts.join(" - ");
};

export default function QuestionGeneratorForm() {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [cognitiveLevel, setCognitiveLevel] = useState("applying");
  const [questionType, setQuestionType] = useState("tita");
  const [count, setCount] = useState("30");
  const [session, setSession] = useState("");
  const [isSessionModified, setIsSessionModified] = useState(false);
  const [regenerate, setRegenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [savedQuestionIds, setSavedQuestionIds] = useState<number[]>([]);

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);

  // Preview & Edit states
  const [draftQuestions, setDraftQuestions] = useState<QuestionData[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // URL Pre-fill support
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await classService.getAll();
        setClasses(data);
        
        // Priority: Check query parameters first
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const qClassId = params.get("classId");
          const qSubjectId = params.get("subjectId");
          const qChapterId = params.get("chapterId");
          const qSelectedText = params.get("selectedText");
          
          if (qSelectedText) {
            setSelectedText(qSelectedText);
          }
          
          if (qClassId && qSubjectId && qChapterId) {
            setIsPrefilled(true);
            setClassId(String(qClassId));
            return;
          }
        }
        
        // Fallback: Restore classId from draft on mount
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("momentum_draft_question_generator");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.classId && data.some(c => String(c.id) === String(parsed.classId))) {
                setClassId(String(parsed.classId));
              }
            } catch (e) {}
          }
        }
      } catch (err: any) {
        console.error("Failed to load classes", err);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!classId) {
        setSubjects([]);
        setSubjectId("");
        return;
      }
      try {
        const data = await subjectService.getAll(classId);
        setSubjects(data);
        
        // Priority: Check query parameters first
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const qClassId = params.get("classId");
          const qSubjectId = params.get("subjectId");
          const qChapterId = params.get("chapterId");
          if (qClassId && qSubjectId && qChapterId) {
            setSubjectId(String(qSubjectId));
            return;
          }
        }

        // Check if there is a matching draft subjectId
        let restoredSubjectId = "";
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("momentum_draft_question_generator");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.subjectId && data.some(s => String(s.id) === String(parsed.subjectId))) {
                restoredSubjectId = String(parsed.subjectId);
              }
            } catch (e) {}
          }
        }
        setSubjectId(restoredSubjectId);
      } catch (err: any) {
        console.error("Failed to load subjects for class", err);
      }
    };
    loadSubjects();
  }, [classId]);

  useEffect(() => {
    const loadChapters = async () => {
      if (!subjectId) {
        setChapters([]);
        setChapterId("");
        return;
      }
      try {
        const data = await chapterService.getBySubject(subjectId);
        setChapters(data);
        
        // Priority: Check query parameters first
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const qClassId = params.get("classId");
          const qSubjectId = params.get("subjectId");
          const qChapterId = params.get("chapterId");
          if (qClassId && qSubjectId && qChapterId) {
            setChapterId(String(qChapterId));
            return;
          }
        }

        // Check if there is a matching draft chapterId
        let restoredChapterId = "";
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("momentum_draft_question_generator");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.chapterId && data.some(ch => String(ch.id) === String(parsed.chapterId))) {
                restoredChapterId = String(parsed.chapterId);
              }
            } catch (e) {}
          }
        }
        setChapterId(restoredChapterId);
      } catch (err: any) {
        console.error("Failed to load chapters for subject", err);
      }
    };
    loadChapters();
  }, [subjectId]);

  // Dynamically update the session identifier when selections change
  useEffect(() => {
    if (!isSessionModified) {
      if (subjectId) {
        const selectedSub = subjects.find((s) => String(s.id) === subjectId);
        const selectedCh = chapters.find((ch) => String(ch.id) === chapterId);
        const subName = selectedSub ? selectedSub.name : "";
        const chNum = selectedCh ? selectedCh.number : "";
        const chTitle = selectedCh ? selectedCh.title : "";
        setSession(generateDefaultSessionName(subName, chNum, chTitle));
      } else {
        setSession("Session " + new Date().getFullYear());
      }
    }
  }, [subjectId, chapterId, subjects, chapters, isSessionModified]);

  // Save draft details to localStorage on change (only if not prefilled)
  useEffect(() => {
    if (typeof window !== "undefined" && !isPrefilled && (classId || subjectId || chapterId)) {
      localStorage.setItem("momentum_draft_question_generator", JSON.stringify({
        classId,
        subjectId,
        chapterId,
        difficulty,
        count
      }));
    }
  }, [classId, subjectId, chapterId, difficulty, count, isPrefilled]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setSuccess(false);
    setError("");
    setProgress(0);

    const selectedSub = subjects.find((s) => String(s.id) === subjectId);
    const selectedCh = chapters.find((ch) => String(ch.id) === chapterId);
    const subName = selectedSub ? selectedSub.name : "";
    const chNum = selectedCh ? selectedCh.number : "";
    const chTitle = selectedCh ? selectedCh.title : "";
    
    // Set the unique session name at the exact moment of generation if not custom edited
    const finalSessionName = isSessionModified 
      ? session 
      : generateDefaultSessionName(subName, chNum, chTitle);
      
    if (!isSessionModified) {
      setSession(finalSessionName);
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 80) {
          clearInterval(interval);
          return 80;
        }
        return prev + 10;
      });
    }, 150);

    try {
      const generated = await questionService.generateAIQuestions({
        classId: classId || undefined,
        subjectId,
        chapterId,
        difficulty: difficulty as any,
        cognitiveLevel,
        count: parseInt(count, 10),
        regenerate,
        previewOnly: true, // Always request preview first so the admin can verify
        session: finalSessionName,
        questionType,
        selectedText: selectedText || undefined
      });
      clearInterval(interval);
      setProgress(100);
      setDraftQuestions(generated);
      setIsReviewMode(true);
    } catch (err: any) {
      clearInterval(interval);
      setError(extractErrorMessage(err, "Failed to generate questions."));
    } finally {
      setGenerating(false);
    }
  };

  const handleQuestionTextChange = (qIndex: number, text: string) => {
    setDraftQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, text } : q))
    );
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    setDraftQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx === qIndex) {
          const newOptions = [...(q.options || [])];
          newOptions[oIndex] = value;

          // Sync correct answer if it was mapped to the old option text
          let newCorrectAnswer = q.correctAnswer;
          if (q.correctAnswer === q.options[oIndex]) {
            newCorrectAnswer = value;
          }

          return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
        }
        return q;
      })
    );
  };

  const handleCorrectAnswerChange = (qIndex: number, value: string) => {
    setDraftQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, correctAnswer: value } : q))
    );
  };

  const handleDeleteDraftQuestion = (qIndex: number) => {
    setDraftQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleAddCustomQuestion = () => {
    const newQ: QuestionData = {
      id: "draft_" + Math.random().toString(36).substring(2, 9),
      text: "",
      options: [],
      correctAnswer: "",
      questionType: "tita",
      difficulty: difficulty as any,
      cognitiveLevel: cognitiveLevel,
      subjectId: subjectId,
      chapterId: chapterId || undefined,
      classId: classId || undefined,
      generatedBy: "manual",
      session: session,
    };
    setDraftQuestions((prev) => [...prev, newQ]);
  };

  const handlePublish = async () => {
    if (draftQuestions.length === 0) {
      setError("Please add at least one question before saving.");
      return;
    }

    // Validation
    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} has empty text.`);
        return;
      }
      if (!q.correctAnswer || !q.correctAnswer.trim()) {
        setError(`Question ${i + 1} must have an expected answer.`);
        return;
      }
    }

    setPublishing(true);
    setError("");

    try {
      const savedRes = await questionService.batchSave({
        questions: draftQuestions.map((q) => ({
          text: q.text,
          options: [],
          correctAnswer: q.correctAnswer,
          questionType: "tita",
          difficulty: q.difficulty,
          cognitiveLevel: q.cognitiveLevel,
          classId: q.classId ? parseInt(String(q.classId), 10) : undefined,
          subjectId: parseInt(String(q.subjectId), 10),
          chapterId: q.chapterId ? parseInt(String(q.chapterId), 10) : undefined,
          generatedBy: q.generatedBy || "manual",
          session: q.session || session,
        })),
        clearExisting: regenerate,
        chapterId: chapterId,
        difficulty: difficulty as any,
        cognitiveLevel: cognitiveLevel,
      });

      setSavedQuestionIds(savedRes.map(q => Number(q.id)));
      setSavedCount(draftQuestions.length);
      setSuccess(true);
      setIsReviewMode(false);
      setDraftQuestions([]);
      setIsSessionModified(false);
      setIsAssignModalOpen(true);
      
      // Clear draft localStorage upon successful save
      if (typeof window !== "undefined") {
        localStorage.removeItem("momentum_draft_question_generator");
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to save questions to database."));
    } finally {
      setPublishing(false);
    }
  };

  const selectedClass = classes.find((c) => String(c.id) === classId);
  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const selectedChapter = chapters.find((ch) => String(ch.id) === chapterId);

  const defaultTitle = selectedSubject && selectedChapter
    ? `${selectedSubject.name} - Chapter ${selectedChapter.number}: ${selectedChapter.title}`
    : selectedSubject
    ? `${selectedSubject.name} Assessment`
    : "New Assessment";

  const classNamePrefill = selectedClass
    ? formatClassName(selectedClass)
    : "";

  return (
    <>
      {isReviewMode ? (
        <div style={styles.workspace}>
          <div style={styles.workspaceHeader}>
            <h2 style={styles.workspaceTitle}>Verify & Edit Generated Questions</h2>
            <p style={styles.workspaceSubtitle}>
              Review the {draftQuestions.length} draft questions created automatically. You can edit text, options, and expected answers, remove questions, or add custom ones before saving.
            </p>
          </div>

          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={styles.cardsList}>
            {draftQuestions.map((q, qIndex) => {
              return (
                <div key={q.id || qIndex} className="glass-panel" style={styles.questionCard}>
                  <div style={styles.cardHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <span style={styles.cardTitle}>Question {qIndex + 1}</span>
                      <span style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        color: "rgb(16, 185, 129)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}>
                        TITA (Descriptive)
                      </span>
                    </div>
                    <div style={styles.cardActions}>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraftQuestion(qIndex)}
                        style={styles.deleteBtn}
                        className="interactive-element"
                        title="Remove Question"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Question Text<span className="required-asterisk">*</span></label>
                    <textarea
                      value={q.text}
                      onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                      style={styles.textarea}
                      placeholder="Enter question text..."
                      required
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Expected Answer<span className="required-asterisk">*</span></label>
                    <textarea
                      value={q.correctAnswer || ""}
                      onChange={(e) => handleCorrectAnswerChange(qIndex, e.target.value)}
                      style={styles.textarea}
                      placeholder="Enter the expected descriptive/numeric answer..."
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {draftQuestions.length === 0 && (
            <div style={styles.emptyState}>
              No draft questions left. Click "+ Add Custom Question" to add one manually, or "Discard Draft" to restart.
            </div>
          )}

          <div style={styles.workspaceActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddCustomQuestion}
              style={styles.actionBtn}
            >
              + Add Custom Question
            </Button>

            <div style={styles.rightActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsReviewMode(false);
                  setDraftQuestions([]);
                  setSuccess(false);
                }}
                style={styles.actionBtn}
                disabled={publishing}
              >
                Discard Draft
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                loading={publishing}
                style={{
                  ...styles.actionBtn,
                  background: "var(--primary)",
                }}
              >
                {publishing ? "Saving..." : `Save & Publish ${draftQuestions.length} Questions`}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerate} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* Section 1: Syllabus Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.2rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Syllabus Selection</h4>
            {isPrefilled ? (
              <div style={styles.preFilledCard}>
                <div style={styles.preFilledLabel}>Generating assessment for</div>
                <div style={styles.preFilledGrid}>
                  <div style={styles.preFilledItem}>
                    <span style={styles.preFilledHeading}>Class</span>
                    <span style={styles.preFilledVal}>
                      {selectedClass ? formatClassName(selectedClass) : "Loading..."}
                    </span>
                  </div>
                  <div style={styles.preFilledItem}>
                    <span style={styles.preFilledHeading}>Subject</span>
                    <span style={styles.preFilledVal}>
                      {selectedSubject ? selectedSubject.name : "Loading..."}
                    </span>
                  </div>
                  <div style={styles.preFilledItem}>
                    <span style={styles.preFilledHeading}>Chapter</span>
                    <span style={styles.preFilledVal}>
                      {selectedChapter ? `Chapter ${selectedChapter.number}: ${selectedChapter.title}` : "Loading..."}
                    </span>
                  </div>
                </div>
                {selectedText && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <span style={styles.preFilledHeading}>Contextual Selection</span>
                    <blockquote style={{ margin: "0.25rem 0 0 0", fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-secondary)", borderLeft: "3px solid var(--primary)", paddingLeft: "0.5rem" }}>
                      "{selectedText.length > 150 ? selectedText.substring(0, 150) + "..." : selectedText}"
                    </blockquote>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-row-responsive">
                <div style={styles.selectGroup}>
                  <label style={styles.label}>Class<span className="required-asterisk">*</span></label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="">Select a Class...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {formatClassName(cls)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.selectGroup}>
                  <label style={styles.label}>Subject<span className="required-asterisk">*</span></label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    style={styles.select}
                    disabled={!classId}
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

                <div style={styles.selectGroup}>
                  <label style={styles.label}>Chapter<span className="required-asterisk">*</span></label>
                  <select
                    value={chapterId}
                    onChange={(e) => setChapterId(e.target.value)}
                    style={styles.select}
                    disabled={!subjectId}
                    required
                  >
                    <option value="">Select a Chapter...</option>
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        Chapter {ch.number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Assessment Parameters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", paddingTop: "0.4rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Assessment Parameters</h4>
            
            <div className="form-row-responsive">
              <div style={styles.selectGroup}>
                <label style={styles.label}>Difficulty Level<span className="required-asterisk">*</span></label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={styles.select}
                >
                  <option value="easy">Easy (Foundational)</option>
                  <option value="medium">Medium (Intermediate)</option>
                  <option value="hard">Hard (Advanced Challenge)</option>
                </select>
              </div>
            </div>

            <div className="form-row-responsive">
              <div style={styles.selectGroup}>
                <Input
                  label="Number of Questions"
                  type="number"
                  min="1"
                  max="30"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  required
                />
              </div>
              <div style={styles.selectGroup}>
                <Input
                  label="Generation Session Name"
                  type="text"
                  placeholder="Auto-generated unique session name"
                  value={session}
                  onChange={(e) => {
                    setSession(e.target.value);
                    setIsSessionModified(true);
                  }}
                  required
                />
              </div>
            </div>
          </div>

          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="regenerate"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="regenerate" style={styles.checkboxLabel}>
              Regenerate Questions (Bypass database cache and create new questions)
            </label>
          </div>

          {(generating || (progress > 0 && progress < 100)) && (
            <div style={styles.progressContainer}>
              <div style={styles.progressText}>
                Generating {count} questions... {progress}%
              </div>
              <div style={styles.progressBarBg}>
                <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
              </div>
            </div>
          )}

          {success && (
            <div style={styles.successBannerContainer}>
              <div style={styles.successBanner}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: "8px" }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{savedCount} questions are ready for review.</span>
              </div>
              <div style={styles.successBannerActions}>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => setIsAssignModalOpen(true)}
                  style={styles.assignBannerBtn}
                >
                  Create & Assign Assessment to Student
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" loading={generating} style={{ width: "100%", marginTop: "1rem" }}>
            {generating ? "Generating..." : "Generate Questions"}
          </Button>
        </form>
      )}

      {isAssignModalOpen && (
        <CreateAndAssignModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          classId={Number(classId)}
          subjectId={Number(subjectId)}
          questionsCount={savedCount}
          defaultTitle={defaultTitle}
          classNamePrefill={classNamePrefill}
          questionIds={savedQuestionIds}
        />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "720px",
    width: "100%",
  },
  selectGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    flexGrow: 1,
    flexBasis: "200px",
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
  progressContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  progressText: {
    fontSize: "0.85rem",
    color: "var(--primary)",
    fontWeight: 600,
  },
  progressBarBg: {
    height: "8px",
    backgroundColor: "var(--border-color)",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "var(--primary)",
    transition: "width 0.3s ease-out",
  },
  successBannerContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.2rem",
    backgroundColor: "var(--success-light)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "var(--radius-md)",
    marginTop: "0.5rem",
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    color: "var(--success)",
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  successBannerActions: {
    display: "flex",
    justifyContent: "flex-start",
  },
  assignBannerBtn: {
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
    marginTop: "0.5rem",
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  // Workspace review styles
  workspace: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  workspaceHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "1rem",
  },
  workspaceTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  workspaceSubtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: "1.4",
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  questionCard: {
    padding: "1.5rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    backgroundColor: "var(--bg-glass)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.8rem",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--primary)",
  },
  cardActions: {
    display: "flex",
    gap: "0.8rem",
    alignItems: "center",
  },
  toggleTypeBtn: {
    padding: "0.4rem 0.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  deleteBtn: {
    padding: "0.4rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    background: "rgba(239, 68, 68, 0.05)",
    color: "var(--error)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  textarea: {
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    width: "100%",
    minHeight: "80px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
  },
  optionsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  optionInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "0.2rem 0.6rem 0.2rem 0.2rem",
    backgroundColor: "var(--bg-app)",
  },
  optionIndicator: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  optionInput: {
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    flexGrow: 1,
    padding: "0.4rem",
  },
  workspaceActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "1rem",
    borderTop: "1px solid var(--border-color)",
    paddingTop: "1.5rem",
  },
  rightActions: {
    display: "flex",
    gap: "1rem",
  },
  actionBtn: {
    minWidth: "120px",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    border: "2px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
  },
  preFilledCard: {
    backgroundColor: "var(--selected-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "1.2rem",
    marginTop: "0.4rem",
  },
  preFilledLabel: {
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.75rem",
  },
  preFilledGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "1.5rem",
  },
  preFilledItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  preFilledHeading: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  preFilledVal: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--primary)",
  },
};
