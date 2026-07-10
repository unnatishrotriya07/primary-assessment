"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import chapterService from "@/services/chapter.service";
import classService from "@/services/class.service";
import subjectService from "@/services/subject.service";
import questionService from "@/services/question.service";
import assessmentService from "@/services/assessment.service";
import { ChapterData, ChapterSectionData } from "@/types/chapter.types";
import { ClassData } from "@/types/class.types";
import { SubjectData } from "@/types/subject.types";
import Button from "@/components/common/Button";
import { isHindiText } from "@/utils/helpers";


export default function ChapterReadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drawer / Generation controls
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"Assessment" | "Worksheet" | "Homework" | "Oral">("Assessment");
  const [selectedSections, setSelectedSections] = useState<Record<number, boolean>>({});
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [cognitiveLevel, setCognitiveLevel] = useState("Understanding");
  const [questionType, setQuestionType] = useState("mixed");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // NCERT Sync status
  const [syncing, setSyncing] = useState(false);

  // Reading Experience states
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  // Contextual Selection
  const [floatingMenu, setFloatingMenu] = useState({ visible: false, x: 0, y: 0, text: "" });

  // Verification Paragraph Highlight
  const [highlightedText, setHighlightedText] = useState<{ sectionId: number; textSnippet: string } | null>(null);

  // Teacher Notes
  const [teacherNote, setTeacherNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const chap = await chapterService.getById(id);
      setChapter(chap);

      const sub = await subjectService.getById(chap.subjectId);
      setSubject(sub);

      const cls = await classService.getById(sub.classId);
      setClassData(cls);

      const allCls = await classService.getAll();
      setClasses(allCls);
      if (allCls.length > 0) {
        setSelectedClassId(String(cls.id));
      }

      // Initialize all sections as checked
      if (chap.bookChapter?.sections) {
        const initialSecs: Record<number, boolean> = {};
        chap.bookChapter.sections.forEach((sec) => {
          initialSecs[sec.id] = true;
        });
        setSelectedSections(initialSecs);
      }

      // Load Teacher Notes from Local Storage
      let email = "default_teacher";
      const userObj = localStorage.getItem("user") || localStorage.getItem("user_session");
      if (userObj) {
        try {
          const parsed = JSON.parse(userObj);
          email = parsed.email || parsed.sub || "default_teacher";
        } catch (e) {}
      }
      const savedNote = localStorage.getItem(`teacher_note_${id}_${email}`);
      if (savedNote) {
        setTeacherNote(savedNote);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load chapter content. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Scroll Progress and Table of Contents intersection observer
  useEffect(() => {
    const handleScroll = () => {
      const reader = readerContainerRef.current;
      if (!reader) return;
      const scrollTop = reader.scrollTop;
      const scrollHeight = reader.scrollHeight - reader.clientHeight;
      if (scrollHeight > 0) {
        setScrollProgress((scrollTop / scrollHeight) * 100);
      }
    };

    const reader = readerContainerRef.current;
    if (reader) {
      reader.addEventListener("scroll", handleScroll);
    }

    // IntersectionObserver for TOC active heading tracking
    let observer: IntersectionObserver;
    if (chapter?.bookChapter?.sections && reader) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const secId = Number(entry.target.id.replace("section-", ""));
              if (!isNaN(secId)) {
                setActiveSectionId(secId);
              }
            }
          });
        },
        {
          root: reader,
          rootMargin: "-20px 0px -80% 0px", // Trigger when heading is near the top of the viewport
          threshold: 0.1,
        }
      );

      chapter.bookChapter.sections.forEach((sec) => {
        const el = document.getElementById(`section-${sec.id}`);
        if (el) observer.observe(el);
      });
    }

    return () => {
      if (reader) {
        reader.removeEventListener("scroll", handleScroll);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [chapter, loading]);

  // Global Keyboard shortcut for search (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync textbook content manually
  const handleSyncContent = async () => {
    setSyncing(true);
    try {
      await chapterService.syncNcert(id);
      showToast("Chapter textbook content downloaded successfully!");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to download textbook content. NCERT servers might be temporarily busy.");
    } finally {
      setSyncing(false);
    }
  };

  // Helper: Show custom Toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  // Heuristic Reading Time calculation (150 words per minute for children textbook complexity)
  const calculateReadingTime = () => {
    if (!chapter?.bookChapter?.sections) return "1 min";
    let totalWords = 0;
    chapter.bookChapter.sections.forEach((sec) => {
      totalWords += sec.plainText.split(/\s+/).length;
    });
    const minutes = Math.ceil(totalWords / 150);
    return `${minutes} min read`;
  };

  // Copy Summary CTA
  const handleCopySummary = () => {
    if (chapter?.bookChapter?.summary) {
      navigator.clipboard.writeText(chapter.bookChapter.summary);
      showToast("Chapter summary copied to clipboard!");
    } else {
      showToast("No summary available to copy.");
    }
  };

  // Open Drawer Flow
  const openDrawer = (type: typeof drawerType) => {
    setDrawerType(type);
    setGeneratedQuestions([]);
    setSaveStatus("");
    setDrawerOpen(true);
  };

  const handleSectionToggle = (sectionId: number) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Call API to generate questions
  const handleGenerateQuestions = async (contextSelectedText?: string) => {
    setGenerating(true);
    setSaveStatus("");
    setGeneratedQuestions([]);
    try {
      const sectionIds = Object.keys(selectedSections)
        .map(Number)
        .filter((key) => selectedSections[key]);

      if (sectionIds.length === 0 && !contextSelectedText) {
        alert("Please select at least one chapter section to generate questions from.");
        setGenerating(false);
        return;
      }

      const params = {
        classId: classData ? String(classData.id) : undefined,
        subjectId: subject ? String(subject.id) : "0",
        chapterId: String(id),
        difficulty: difficulty.toLowerCase() as any,
        cognitiveLevel: cognitiveLevel.toLowerCase(),
        count: questionCount,
        regenerate: true,
        previewOnly: true,
        questionType: drawerType === "Oral" ? "tita" : questionType,
        selectedText: contextSelectedText || undefined,
      };

      const result = await questionService.generateAIQuestions(params);
      setGeneratedQuestions(result);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Question generation failed. Make sure your LLM provider API key is configured.");
    } finally {
      setGenerating(false);
    }
  };

  // Save generated questions to the database and assign
  const handleSaveAndAssign = async () => {
    if (generatedQuestions.length === 0) return;
    setGenerating(true);
    setSaveStatus("Saving questions and creating assessment...");
    try {
      const savedQuestions = await questionService.batchSave({
        questions: generatedQuestions.map((q) => ({
          text: q.text,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          questionType: q.questionType || "tita",
          difficulty: q.difficulty || (difficulty.toLowerCase() as any),
          cognitiveLevel: q.cognitiveLevel || cognitiveLevel.toLowerCase(),
          classId: classData ? Number(classData.id) : undefined,
          subjectId: subject ? Number(subject.id) : 0,
          chapterId: Number(id),
          generatedBy: q.generatedBy || "gemini",
          source: q.source || "NCERT Textbook",
          section: q.section,
          page: q.page,
          confidence: q.confidence,
          referenceText: q.referenceText,
        })),
        chapterId: id,
        difficulty: difficulty.toLowerCase() as any,
        cognitiveLevel: cognitiveLevel.toLowerCase(),
      });

      const title = `${chapter?.title || "Assessment"} - ${drawerType}`;
      const assessmentData = {
        title,
        classId: Number(selectedClassId),
        subjectId: subject ? Number(subject.id) : 0,
        status: "Active",
        questionsCount: savedQuestions.length,
        questionsToAsk: savedQuestions.length,
        date: new Date().toISOString().split("T")[0],
        type: drawerType,
        questionIds: savedQuestions.map((q: any) => q.id),
      };

      await assessmentService.create(assessmentData);
      setSaveStatus("Created successfully!");
      showToast(`${drawerType} generated and assigned successfully!`);
      setTimeout(() => {
        setDrawerOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save or assign. Please check your credentials.");
      setSaveStatus("");
    } finally {
      setGenerating(false);
    }
  };

  // Text selection handler for floating context menu
  const handleTextSelection = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 8) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setFloatingMenu({
          visible: true,
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY - 44,
          text: text,
        });
      }
    } else {
      setFloatingMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  // Click handler from Selection Float Menu: "Create Questions"
  const handleFloatingCreateQuestions = () => {
    setFloatingMenu((prev) => ({ ...prev, visible: false }));
    setDrawerType("Assessment");
    setDrawerOpen(true);
    setGenerating(true);
    setGeneratedQuestions([]);
    handleGenerateQuestions(floatingMenu.text);
  };

  // AI Verification: Scroll to target paragraph and trigger pulse glow animation
  const handleViewSource = (q: any) => {
    if (!q.referenceText || !chapter?.bookChapter?.sections) return;

    // Search for section matching heading or ID
    let targetSectionId = q.section;
    let sectionData = chapter.bookChapter.sections.find(
      (s) => s.heading.toLowerCase().trim() === String(targetSectionId).toLowerCase().trim()
    );

    if (!sectionData && q.section) {
      // Fallback: try finding any section containing referenceText
      sectionData = chapter.bookChapter.sections.find((s) =>
        s.plainText.toLowerCase().includes(q.referenceText.toLowerCase())
      );
    }

    if (!sectionData) {
      // Direct fallback to first section if nothing matches
      sectionData = chapter.bookChapter.sections[0];
    }

    setHighlightedText({
      sectionId: sectionData.id,
      textSnippet: q.referenceText,
    });

    // Close floating selector
    setFloatingMenu((prev) => ({ ...prev, visible: false }));

    // Scroll to element
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionData.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Flash text visual helper by selecting it or finding paragraphs
        const paragraphs = element.getElementsByTagName("p");
        let matchedPara: HTMLElement | null = null;
        for (let i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i].innerText.toLowerCase().includes(q.referenceText.toLowerCase().substring(0, 15))) {
            matchedPara = paragraphs[i];
            break;
          }
        }
        
        if (matchedPara) {
          matchedPara.scrollIntoView({ behavior: "smooth", block: "center" });
          matchedPara.classList.remove("glow-highlight");
          void matchedPara.offsetWidth; // Trigger reflow to restart animation
          matchedPara.classList.add("glow-highlight");
        } else {
          // If no specific paragraph matches, flash heading
          const headings = element.getElementsByTagName("h2");
          if (headings.length > 0) {
            headings[0].classList.add("glow-highlight");
          }
        }
      }
    }, 100);

    showToast("Scrolled to reference source in textbook.");
  };

  // Teacher Notes autosave handler
  const handleNoteChange = (val: string) => {
    setTeacherNote(val);
    setSavingNote(true);

    let email = "default_teacher";
    const userObj = localStorage.getItem("user") || localStorage.getItem("user_session");
    if (userObj) {
      try {
        const parsed = JSON.parse(userObj);
        email = parsed.email || parsed.sub || "default_teacher";
      } catch (e) {}
    }

    // Simulate small save debounce
    localStorage.setItem(`teacher_note_${id}_${email}`, val);
    setTimeout(() => {
      setSavingNote(false);
    }, 400);
  };

  // Helper to escape regex special characters
  const escapeRegExp = (str: string) => {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };

  // Safe Search text highlighter (doesn't modify tag parameters)
  const renderHighlightedContent = (htmlContent: string, sectionId: number) => {
    let result = htmlContent;

    // 1. Apply Grounding Verifications Highlights first
    if (highlightedText && highlightedText.sectionId === sectionId) {
      // Find clean snippet to highlight
      const snippet = highlightedText.textSnippet.trim();
      if (snippet.length > 6) {
        // Safe regex matching the snippet only outside tags
        const escaped = escapeRegExp(snippet);
        const regex = new RegExp(`(${escaped})(?![^<>]*>)`, "gi");
        result = result.replace(regex, `<mark class="glow-highlight">$1</mark>`);
      }
    }

    // 2. Apply search queries highlights
    if (searchQuery.trim()) {
      const escapedQuery = escapeRegExp(searchQuery.trim());
      const regex = new RegExp(`(${escapedQuery})(?![^<>]*>)`, "gi");
      result = result.replace(regex, `<mark class="search-match">$1</mark>`);
    }

    return result;
  };

  // Smooth scroll helper for TOC clicks
  const scrollToHeading = (secId: number) => {
    const el = document.getElementById(`section-${secId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" style={styles.spinner}></div>
        <p style={{ marginTop: "1rem", fontWeight: 500 }}>Loading textbook reading workspace...</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div style={styles.errorContainer}>
        <h3>Error Loading Content</h3>
        <p style={{ color: "var(--error)", margin: "1rem 0" }}>{error || "Chapter not found."}</p>
        <Button onClick={() => router.push("/syllabus?tab=chapters")}>Back to Chapters</Button>
      </div>
    );
  }

  const bookChapter = chapter.bookChapter;
  const isHindi = subject?.name?.toLowerCase() === "hindi" || (chapter && isHindiText(chapter.title));


  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{ __html: `
        .glow-highlight {
          background-color: #FEF08A !important;
          color: #111827 !important;
          border-radius: 4px;
          padding: 2px 4px;
          box-shadow: 0 0 10px #FEF08A;
          animation: glow-fade 5s ease-in-out forwards;
        }
        @keyframes glow-fade {
          0% { filter: brightness(1.2); }
          75% { background-color: #FEF08A; }
          100% { background-color: transparent; box-shadow: none; }
        }
        .search-match {
          background-color: #BFDBFE !important;
          color: #111827 !important;
          border-radius: 2px;
          padding: 0 2px;
        }
        .chapter-section-content img {
          max-width: 100%;
          height: auto;
          border-radius: var(--radius-md);
          margin: 1.5rem 0;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }
        .chapter-section-content p {
          margin-bottom: 1.25rem;
          font-size: 1.05rem;
          line-height: 1.75;
          color: #374151;
        }
        .chapter-section-content h3, .chapter-section-content h4 {
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }
        .chapter-section-content ul, .chapter-section-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .chapter-section-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
          color: #374151;
        }
        .chapter-section-content .activity-card, .chapter-section-content .example-card {
          background-color: var(--selected-bg);
          border: 1px solid var(--primary-light);
          border-left: 4px solid var(--primary);
          padding: 1.25rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }
      `}} />

      {/* Dynamic Breadcrumbs */}
      <div style={styles.breadcrumb}>
        <Link href={`/syllabus?classId=${classData?.id}`} style={styles.breadcrumbLink}>
          {classData?.name || "Classes"}
        </Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <Link href={`/syllabus?classId=${classData?.id}&subjectId=${subject?.id}`} style={styles.breadcrumbLink} className={subject?.name?.toLowerCase() === "hindi" ? "font-hindi" : ""}>
          {subject?.name || "Subjects"}
        </Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbActive} className={isHindi ? "font-hindi" : ""}>Chapter {chapter.number}</span>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Floating Selected Text Menu */}
      {floatingMenu.visible && (
        <div
          style={{
            ...styles.floatingMenu,
            left: `${floatingMenu.x}px`,
            top: `${floatingMenu.y}px`,
          }}
          className="glass-panel"
        >
          <button style={styles.floatingMenuBtn} onClick={handleFloatingCreateQuestions}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "6px" }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Questions
          </button>
        </div>
      )}

      {/* Main Chapter Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title} className={isHindi ? "font-hindi" : ""}>{chapter.number}. {chapter.title}</h1>
          {bookChapter && (
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {calculateReadingTime()}
              </span>
              <span style={styles.metaItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                NCERT Curriculum Reference
              </span>
            </div>
          )}
        </div>
        {bookChapter && (
          <Button
            onClick={() => router.push(`/assessments?tab=generate&classId=${classData?.id}&subjectId=${subject?.id}&chapterId=${id}`)}
            variant="primary"
          >
            Create Assessment from Chapter
          </Button>
        )}
      </div>


      {/* Content Layout */}
      {!bookChapter ? (
        // Not Synced Empty State
        <div style={styles.emptyStateCard} className="card">
          <div style={styles.emptyStateIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 2v20" />
            </svg>
          </div>
          <h3>Chapter textbook content not synced</h3>
          <p>The structured HTML reading experience and image assets for this NCERT chapter have not been downloaded yet.</p>
          <Button onClick={handleSyncContent} disabled={syncing} variant="primary">
            {syncing ? "Downloading content..." : "Download Textbook Content"}
          </Button>
        </div>
      ) : (
        <div style={styles.workspaceGrid}>
          {/* Scroll progress wrapper */}
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressFill, width: `${scrollProgress}%` }}></div>
          </div>

          {/* Left Column: TOC + Notion/Medium-like Scrollable Reader */}
          <div style={styles.readerColumn} className="card">
            {/* Search and Navigation Header inside Chapter */}
            <div style={styles.searchHeaderBar}>
              <div style={styles.searchInputWrapper}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--text-secondary)" }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search inside chapter (Press ⌘F or Ctrl+F)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* Reading Column Layout: Left TOC sidebar, Right scroll content */}
            <div style={styles.readerSplitGrid}>
              {/* Sticky TOC Sidebar */}
              <div style={styles.tocColumn}>
                <div style={styles.tocStickyBox}>
                  <div style={styles.tocHeader}>Table of Contents</div>
                  {bookChapter.sections?.map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    const isSecHindi = isHindi || isHindiText(sec.heading);
                    return (
                      <button
                        key={sec.id}
                        onClick={() => scrollToHeading(sec.id)}
                        style={{
                          ...styles.tocItem,
                          color: isActive ? "var(--primary)" : "var(--text-secondary)",
                          fontWeight: isActive ? 600 : 400,
                          borderLeftColor: isActive ? "var(--primary)" : "transparent",
                          backgroundColor: isActive ? "var(--selected-bg)" : "transparent",
                        }}
                        className={`interactive-element ${isSecHindi ? "font-hindi" : ""}`}
                      >
                        {sec.heading}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Reader Area */}
              <div
                ref={readerContainerRef}
                style={styles.sectionsList}
                onMouseUp={handleTextSelection}
              >
                {/* Learning Objectives box */}
                <div style={styles.objectivesBox}>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)", fontSize: "0.95rem", fontWeight: 700 }}>
                    Learning Objectives
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }} className={isHindi ? "font-hindi" : ""}>
                    <li>Understand the core conceptual topics of {chapter.title}.</li>
                    <li>Apply positional vocabulary and practical logic discussed in this unit.</li>
                  </ul>
                </div>

                {bookChapter.sections?.map((sec) => {
                  const isSecHindi = isHindi || isHindiText(sec.heading) || isHindiText(sec.plainText);
                  return (
                    <section key={sec.id} id={`section-${sec.id}`} style={styles.sectionItem} className={isSecHindi ? "font-hindi" : ""}>
                      <h2 style={styles.sectionHeading} className={isSecHindi ? "font-hindi" : ""}>{sec.heading}</h2>
                      <div
                        className={`chapter-section-content ${isSecHindi ? "font-hindi" : ""}`}
                        style={styles.sectionHtml}
                        dangerouslySetInnerHTML={{ __html: renderHighlightedContent(sec.htmlContent, sec.id) }}
                      />
                    </section>
                  );
                })}

              </div>
            </div>
          </div>

          {/* Right Column: Sticky Action Panel & Notes */}
          <div style={styles.sidebarColumn}>
            <div style={styles.stickyPanel} className="card">
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 600 }}>Teaching Tools</h3>
              <p style={{ margin: "0 0 1.2rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Quick actions for lessons and evaluations generated directly from text.
              </p>

              <div style={styles.actionButtonList}>
                <button
                  style={styles.panelActionBtn}
                  className="interactive-element"
                  onClick={() => openDrawer("Assessment")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", color: "var(--primary)" }}>
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Create Questions
                </button>
                <div style={{ height: "1px", backgroundColor: "var(--divider)", margin: "0.5rem 0" }} />


                <button style={styles.panelActionBtnGhost} className="interactive-element" onClick={handleCopySummary}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Chapter Summary
                </button>
              </div>
            </div>

            {/* Teacher Notes Panel */}
            <div style={styles.notesPanel} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>My Workspace Notes</h3>
                {savingNote ? (
                  <span style={styles.savingBadge}>Saving...</span>
                ) : (
                  <span style={styles.savedBadge}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: "3px" }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Saved
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 0.8rem 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Private notes visible only to you. Autosaved locally.
              </p>
              <textarea
                style={styles.notesTextarea}
                placeholder="Important concepts, children struggled here, revise tomorrow..."
                value={teacherNote}
                onChange={(e) => handleNoteChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Generation Workspace Drawer */}
      {drawerOpen && (
        <div style={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                Generate Questions
              </h2>
              <button style={styles.drawerCloseBtn} onClick={() => setDrawerOpen(false)}>
                &times;
              </button>
            </div>

            <div style={styles.drawerContent}>
              {/* Context Selected Text Indicator */}
              {floatingMenu.text && (
                <div style={styles.drawerSelectedTextCard}>
                  <span style={styles.preFilledHeading}>Generating from selection context:</span>
                  <blockquote style={styles.drawerSelectionQuote}>
                    "{floatingMenu.text.length > 200 ? floatingMenu.text.substring(0, 200) + "..." : floatingMenu.text}"
                  </blockquote>
                </div>
              )}

              {/* Step 1: Select Sections & Parameters */}
              {!floatingMenu.text && (
                <div style={styles.formSection}>
                  <h4 style={styles.formSectionTitle}>1. Target Chapter Sections</h4>
                  <div style={styles.sectionCheckboxList}>
                    {bookChapter?.sections?.map((sec) => (
                      <label key={sec.id} style={styles.checkboxLabel} className="interactive-element">
                        <input
                          type="checkbox"
                          checked={!!selectedSections[sec.id]}
                          onChange={() => handleSectionToggle(sec.id)}
                          style={{ marginRight: "8px" }}
                        />
                        {sec.heading}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.formSection}>
                <h4 style={styles.formSectionTitle}>{floatingMenu.text ? "1. Parameters" : "2. Parameters"}</h4>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.fieldLabel}>Count</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      style={styles.fieldInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.fieldLabel}>Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      style={styles.fieldInput}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.fieldLabel}>Cognitive Level</label>
                    <select
                      value={cognitiveLevel}
                      onChange={(e) => setCognitiveLevel(e.target.value)}
                      style={styles.fieldInput}
                    >
                      <option value="Remembering">Remembering</option>
                      <option value="Understanding">Understanding</option>
                      <option value="Applying">Applying</option>
                      <option value="Analyzing">Analyzing</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
                <Button
                  onClick={() => handleGenerateQuestions(floatingMenu.text)}
                  disabled={generating}
                  variant="primary"
                  style={{ width: "100%" }}
                >
                  {generating ? "Generating questions..." : "Generate Questions"}
                </Button>
              </div>

              {/* Step 2: Review Generated Questions & Verification */}
              {generatedQuestions.length > 0 && (
                <div style={styles.formSection}>
                  <h4 style={styles.formSectionTitle}>Generated Questions Review</h4>
                  <div style={styles.questionsListPreview}>
                    {generatedQuestions.map((q, qIdx) => (
                      <div key={qIdx} style={styles.qPreviewCard} className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={styles.qTypeBadge}>QUESTION {qIdx + 1}</span>
                          <button
                            onClick={() => {
                              setGeneratedQuestions((prev) => prev.filter((_, i) => i !== qIdx));
                            }}
                            style={styles.qDeleteBtn}
                          >
                            Remove
                          </button>
                        </div>
                        
                        <p style={{ margin: "0.5rem 0", fontWeight: 600, color: "var(--text-primary)" }}>{q.text}</p>
                        
                        {q.correctAnswer && (
                          <p style={{ margin: "0.5rem 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                            <strong style={{ color: "var(--text-primary)" }}>Expected Answer:</strong> {q.correctAnswer}
                          </p>
                        )}

                        {/* AI Groundedness Verification Metadata Badge Group */}
                        <div style={styles.verificationBadgeGroup}>
                          <span style={styles.metaBadge}>
                            Source: {q.source || "NCERT Textbook"}
                          </span>
                          {q.section && (
                            <span style={styles.metaBadge}>
                              Section: {q.section}
                            </span>
                          )}
                          {q.page && (
                            <span style={styles.metaBadge}>
                              Page: {q.page}
                            </span>
                          )}
                          {q.confidence !== undefined && (
                            <span style={{
                              ...styles.metaBadge,
                              backgroundColor: q.confidence > 85 ? "#DCFCE7" : "#FEF3C7",
                              color: q.confidence > 85 ? "#15803D" : "#B45309",
                              fontWeight: 600
                            }}>
                              Confidence: {q.confidence}%
                            </span>
                          )}
                        </div>

                        {q.referenceText && (
                          <div style={{ marginTop: "0.8rem", display: "flex", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleViewSource(q)}
                              style={styles.viewSourceBtn}
                              className="interactive-element"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "4px" }}>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              Verify in Textbook
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 3: Assign */}
                  <div style={{ ...styles.formSection, marginTop: "2rem" }}>
                    <h4 style={styles.formSectionTitle}>Target Class to Assign</h4>
                    <div style={styles.formGroup}>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        style={styles.fieldInput}
                      >
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.5rem" }}>
                    <Button
                      onClick={handleSaveAndAssign}
                      disabled={generating}
                      variant="primary"
                      style={{ width: "100%" }}
                    >
                      {saveStatus || "Create & Assign Assessment"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "2rem 0",
    maxWidth: "1440px",
    margin: "0 auto",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10rem",
    color: "var(--text-secondary)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border-color)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorContainer: {
    padding: "5rem",
    textAlign: "center",
    color: "var(--text-primary)",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  breadcrumbLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
  breadcrumbSeparator: {
    color: "var(--text-muted)",
  },
  breadcrumbActive: {
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  toast: {
    position: "fixed",
    top: "24px",
    right: "24px",
    backgroundColor: "#111827",
    color: "white",
    padding: "12px 24px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    zIndex: 9999,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    fontSize: "0.9rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "1.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  metaRow: {
    display: "flex",
    gap: "1.5rem",
    marginTop: "0.75rem",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
  },
  emptyStateCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "4rem 2rem",
    backgroundColor: "white",
    borderRadius: "14px",
    boxShadow: "var(--shadow-sm)",
    gap: "1rem",
    maxWidth: "600px",
    margin: "2rem auto",
  },
  emptyStateIcon: {
    color: "var(--text-muted)",
  },
  workspaceGrid: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: "2rem",
    alignItems: "start",
  },
  progressContainer: {
    position: "absolute",
    top: "-8px",
    left: 0,
    right: 0,
    height: "3px",
    backgroundColor: "var(--border-color)",
    zIndex: 100,
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "var(--primary)",
    transition: "width 0.1s ease-out",
  },
  readerColumn: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "14px",
    boxShadow: "var(--shadow-sm)",
    minHeight: "600px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  searchHeaderBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "1rem",
  },
  searchInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: 1,
    height: "40px",
    padding: "0 1rem",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    gap: "0.5rem",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
  },
  clearSearchBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1.2rem",
    color: "var(--text-secondary)",
    padding: 0,
  },
  readerSplitGrid: {
    display: "flex",
    gap: "2rem",
    alignItems: "start",
  },
  tocColumn: {
    width: "200px",
    position: "sticky",
    top: "96px",
    alignSelf: "start",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  tocStickyBox: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    borderRight: "1px solid var(--divider)",
    paddingRight: "1rem",
  },
  tocHeader: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    letterSpacing: "0.05em",
    marginBottom: "0.75rem",
    paddingLeft: "0.75rem",
  },
  tocItem: {
    display: "block",
    width: "100%",
    padding: "0.6rem 0.75rem",
    borderRadius: "0 6px 6px 0",
    borderLeft: "2px solid transparent",
    fontSize: "0.85rem",
    cursor: "pointer",
    background: "none",
    borderTop: "none",
    borderRight: "none",
    borderBottom: "none",
    textAlign: "left",
    transition: "all var(--transition-fast)",
  },
  sectionsList: {
    flex: 1,
    minWidth: 0,
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto",
    paddingRight: "1rem",
  },
  objectivesBox: {
    backgroundColor: "#F8FAFC",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "1.25rem",
    marginBottom: "2.5rem",
  },
  sectionItem: {
    borderBottom: "1px solid var(--divider)",
    paddingBottom: "2.5rem",
    marginBottom: "2.5rem",
  },
  sectionHeading: {
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0 0 1.25rem 0",
    letterSpacing: "-0.015em",
  },
  sectionHtml: {
    fontSize: "1.05rem",
    lineHeight: 1.8,
    color: "#374151",
  },
  sidebarColumn: {
    position: "sticky",
    top: "96px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  stickyPanel: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "14px",
    boxShadow: "var(--shadow-sm)",
  },
  actionButtonList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  panelActionBtn: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: "40px",
    padding: "0 12px",
    backgroundColor: "white",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    textAlign: "left",
  },
  panelActionBtnDisabled: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: "40px",
    padding: "0 12px",
    backgroundColor: "var(--bg-surface-hover)",
    border: "1px solid var(--divider)",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-muted)",
    cursor: "not-allowed",
    textAlign: "left",
  },
  disabledBadge: {
    fontSize: "0.7rem",
    padding: "2px 6px",
    borderRadius: "999px",
    backgroundColor: "var(--divider)",
    color: "var(--text-secondary)",
  },
  panelActionBtnGhost: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: "40px",
    padding: "0 12px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    textAlign: "left",
  },
  notesPanel: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "14px",
    boxShadow: "var(--shadow-sm)",
  },
  savingBadge: {
    fontSize: "0.75rem",
    color: "var(--warning)",
    fontWeight: 500,
  },
  savedBadge: {
    fontSize: "0.75rem",
    color: "var(--success)",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
  },
  notesTextarea: {
    width: "100%",
    height: "120px",
    padding: "0.75rem",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    resize: "none",
    outline: "none",
    lineHeight: "1.4",
  },
  floatingMenu: {
    position: "absolute",
    zIndex: 5000,
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "4px",
    display: "flex",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
    border: "1px solid var(--border-color)",
    transform: "translateX(-50%)",
  },
  floatingMenuBtn: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--primary)",
    cursor: "pointer",
    borderRadius: "6px",
    background: "var(--selected-bg)",
  },
  drawerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    zIndex: 9000,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "520px",
    height: "100%",
    backgroundColor: "white",
    boxShadow: "var(--shadow-lg)",
    display: "flex",
    flexDirection: "column",
    animation: "fadeIn 0.2s ease-out forwards",
  },
  drawerHeader: {
    padding: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "1.75rem",
    cursor: "pointer",
    color: "var(--text-secondary)",
  },
  drawerContent: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
  },
  drawerSelectedTextCard: {
    backgroundColor: "var(--selected-bg)",
    border: "1px solid var(--border-color)",
    padding: "1rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
  },
  drawerSelectionQuote: {
    margin: "0.5rem 0 0 0",
    fontSize: "0.85rem",
    color: "#4B5563",
    fontStyle: "italic",
    borderLeft: "3px solid var(--primary)",
    paddingLeft: "0.75rem",
  },
  formSection: {
    marginBottom: "1.5rem",
  },
  formSectionTitle: {
    margin: "0 0 0.75rem 0",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  sectionCheckboxList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxHeight: "150px",
    overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "0.75rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  fieldInput: {
    height: "40px",
    padding: "0 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    backgroundColor: "white",
  },
  questionsListPreview: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "380px",
    overflowY: "auto",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "0.75rem",
    backgroundColor: "var(--bg-app)",
  },
  qPreviewCard: {
    padding: "1.25rem",
    backgroundColor: "white",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow-sm)",
  },
  qTypeBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    backgroundColor: "var(--selected-bg)",
    color: "var(--primary)",
    padding: "2px 6px",
    borderRadius: "4px",
    letterSpacing: "0.03em",
  },
  qDeleteBtn: {
    background: "none",
    border: "none",
    color: "var(--error)",
    fontSize: "0.8rem",
    cursor: "pointer",
    fontWeight: 500,
  },
  verificationBadgeGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
  metaBadge: {
    fontSize: "0.75rem",
    backgroundColor: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    padding: "2px 8px",
    borderRadius: "999px",
  },
  viewSourceBtn: {
    display: "inline-flex",
    alignItems: "center",
    background: "none",
    border: "none",
    color: "var(--primary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
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
