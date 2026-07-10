"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ClassForm from "@/components/forms/ClassForm";
import SubjectForm from "@/components/forms/SubjectForm";
import ChapterForm from "@/components/forms/ChapterForm";

import classService from "@/services/class.service";
import subjectService from "@/services/subject.service";
import chapterService from "@/services/chapter.service";
import { ClassData } from "@/types/class.types";
import { SubjectData } from "@/types/subject.types";
import { ChapterData } from "@/types/chapter.types";
import { extractErrorMessage, isHindiText } from "@/utils/helpers";

import { STORAGE_KEYS } from "@/utils/constants";

// Custom premium checkbox to match the mockup (rounded blue container with white dot)
interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const CustomCheckbox = ({ checked, onChange, label }: CustomCheckboxProps) => {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.75rem",
        cursor: "pointer",
        userSelect: "none",
        fontSize: "0.95rem",
        color: "var(--text-secondary)",
        marginTop: "0.5rem",
      }}
    >
      <div 
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "6px",
          border: checked ? "2px solid #2F80ED" : "2px solid var(--text-muted)",
          backgroundColor: checked ? "#2F80ED" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
      >
        {checked && (
          <div 
            style={{
              width: "6px",
              height: "6px",
              backgroundColor: "white",
              borderRadius: "1px",
            }} 
          />
        )}
      </div>
      <span>{label}</span>
    </div>
  );
};

function SyllabusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Lists and Data states
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);

  // Selection states (For tree/collapsible views)
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);

  // Modal active states (For Admin modal drilldown)
  const [activeClass, setActiveClass] = useState<ClassData | null>(null);
  const [activeSubject, setActiveSubject] = useState<SubjectData | null>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterData | null>(null);

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Errors
  const [errorClasses, setErrorClasses] = useState("");
  const [errorSubjects, setErrorSubjects] = useState("");
  const [errorChapters, setErrorChapters] = useState("");

  // Search terms
  const [classSearch, setClassSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [chapterSearch, setChapterSearch] = useState("");

  // Pagination States
  const [classPage, setClassPage] = useState(1);
  const [classesPerPage] = useState(5);
  const [chapterPage, setChapterPage] = useState(1);
  const [chaptersPerPage] = useState(10);

  // Applied Filter States
  const [appliedGrades, setAppliedGrades] = useState<string[]>([]);
  const [appliedSections, setAppliedSections] = useState<string[]>([]);
  const [appliedOnlyWithStudents, setAppliedOnlyWithStudents] = useState(false);
  const [appliedStatus, setAppliedStatus] = useState<string[]>([]);
  const [appliedSyncStatus, setAppliedSyncStatus] = useState<string[]>([]);
  const [appliedOnlySynced, setAppliedOnlySynced] = useState(false);

  // Temp Filter States (modal inputs)
  const [tempGrades, setTempGrades] = useState<string[]>([]);
  const [tempSections, setTempSections] = useState<string[]>([]);
  const [tempOnlyWithStudents, setTempOnlyWithStudents] = useState(false);
  const [tempStatus, setTempStatus] = useState<string[]>([]);
  const [tempSyncStatus, setTempSyncStatus] = useState<string[]>([]);
  const [tempOnlySynced, setTempOnlySynced] = useState(false);

  // Modal & Dropdown visibility states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"grade" | "section" | "status" | "sync" | null>(null);

  const toggleDropdown = (dropdown: "grade" | "section" | "status" | "sync") => {
    setOpenDropdown(prev => prev === dropdown ? null : dropdown);
  };

  const toggleGrade = (grade: string) => {
    setTempGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const toggleSection = (sec: string) => {
    setTempSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  };

  const toggleStatus = (status: string) => {
    setTempStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleSyncStatus = (sync: string) => {
    setTempSyncStatus(prev => 
      prev.includes(sync) ? prev.filter(s => s !== sync) : [...prev, sync]
    );
  };

  const handleOpenFilters = () => {
    setTempGrades(appliedGrades);
    setTempSections(appliedSections);
    setTempOnlyWithStudents(appliedOnlyWithStudents);
    setTempStatus(appliedStatus);
    setTempSyncStatus(appliedSyncStatus);
    setTempOnlySynced(appliedOnlySynced);
    setOpenDropdown(null);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedGrades(tempGrades);
    setAppliedSections(tempSections);
    setAppliedOnlyWithStudents(tempOnlyWithStudents);
    setAppliedStatus(tempStatus);
    setAppliedSyncStatus(tempSyncStatus);
    setAppliedOnlySynced(tempOnlySynced);
    setClassPage(1); // Reset page on filter apply
    setChapterPage(1); // Reset page on filter apply
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setTempGrades([]);
    setTempSections([]);
    setTempOnlyWithStudents(false);
    setTempStatus([]);
    setTempSyncStatus([]);
    setTempOnlySynced(false);

    setAppliedGrades([]);
    setAppliedSections([]);
    setAppliedOnlyWithStudents(false);
    setAppliedStatus([]);
    setAppliedSyncStatus([]);
    setAppliedOnlySynced(false);
    
    setClassPage(1); // Reset page on filter reset
    setChapterPage(1); // Reset page on filter reset
    setIsFilterModalOpen(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (appliedGrades.length > 0) count++;
    if (appliedSections.length > 0) count++;
    if (appliedOnlyWithStudents) count++;
    if (appliedStatus.length > 0) count++;
    if (appliedSyncStatus.length > 0) count++;
    if (appliedOnlySynced) count++;
    return count;
  };

  // CRUD Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);

  // Boards state
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [boards, setBoards] = useState([
    { id: "cbse", name: "CBSE (Central Board of Secondary Education)", language: "English / Hindi", status: "Active", classesCount: 5 },
    { id: "icse", name: "ICSE (Indian Certificate of Secondary Education)", language: "English", status: "Active", classesCount: 3 },
    { id: "state", name: "State Board (Syllabus Core)", language: "Regional Languages / English", status: "Active", classesCount: 4 },
  ]);
  const [boardSearch, setBoardSearch] = useState("");
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardLanguage, setNewBoardLanguage] = useState("English");

  // Drilldown Modals
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);

  // Superadmin permission helper
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);


  const getSearchPlaceholder = () => {
    if (isSuperAdmin && !activeBoard) return "Search curriculum boards by name...";
    if (!activeClass) return "Search classes by name, grade, or section...";
    if (!activeSubject) return `Search subjects in ${activeClass.name}...`;
    return `Search chapters in ${activeSubject.name}...`;
  };

  const getSearchValue = () => {
    if (isSuperAdmin && !activeBoard) return boardSearch;
    if (!activeClass) return classSearch;
    if (!activeSubject) return subjectSearch;
    return chapterSearch;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isSuperAdmin && !activeBoard) {
      setBoardSearch(val);
    } else if (!activeClass) {
      setClassSearch(val);
      setClassPage(1); // Reset page on class search
    }
    else if (!activeSubject) setSubjectSearch(val);
    else {
      setChapterSearch(val);
      setChapterPage(1); // Reset page on chapter search
    }
  };
  const [syncingChapterId, setSyncingChapterId] = useState<string | number | null>(null);

  // Load User details on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          if (parsed.role === "admin" && !parsed.tenantId) {
            setIsSuperAdmin(true);
          }
        } catch (e) {}
      }
      setLoadingUser(false);
    }
  }, []);

  // Sync URL search params with active drilldown state
  useEffect(() => {
    // 1. Sync activeBoard / tab=boards
    const tabParam = searchParams.get("tab");
    const boardParam = searchParams.get("boardName");
    
    if (tabParam === "boards") {
      setActiveBoard(null);
      setActiveClass(null);
      setActiveSubject(null);
    } else if (boardParam) {
      if (boardParam !== activeBoard) {
        setActiveBoard(boardParam);
      }
    }

    // 2. Sync activeClass
    const classIdParam = searchParams.get("classId");
    if (classIdParam) {
      const cls = classes.find((c) => String(c.id) === classIdParam);
      if (cls) {
        if (!activeClass || String(activeClass.id) !== classIdParam) {
          setActiveClass(cls);
          fetchSubjectsForClass(cls.id);
        }
      }
    } else {
      if (activeClass !== null && tabParam !== "boards") {
        setActiveClass(null);
        setActiveSubject(null);
      }
    }

    // 3. Sync activeSubject
    const subjectIdParam = searchParams.get("subjectId");
    if (subjectIdParam) {
      const sub = subjects.find((s) => String(s.id) === subjectIdParam);
      if (sub) {
        if (!activeSubject || String(activeSubject.id) !== subjectIdParam) {
          setActiveSubject(sub);
          fetchChaptersForSubject(sub.id);
        }
      }
    } else {
      if (activeSubject !== null && tabParam !== "boards") {
        setActiveSubject(null);
      }
    }
  }, [searchParams, classes, subjects]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    setErrorClasses("");
    try {
      const data = await classService.getAll();
      setClasses(data);
    } catch (err: any) {
      setErrorClasses(extractErrorMessage(err, "Failed to load classes."));
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch subjects when active/selected class changes
  const fetchSubjectsForClass = async (classId: string) => {
    setLoadingSubjects(true);
    setErrorSubjects("");
    try {
      const data = await subjectService.getAll(classId);
      setSubjects(data);
    } catch (err: any) {
      setErrorSubjects(extractErrorMessage(err, "Failed to load subjects."));
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch chapters when active/selected subject changes
  const fetchChaptersForSubject = async (subjectId: string) => {
    setLoadingChapters(true);
    setErrorChapters("");
    try {
      const data = await chapterService.getBySubject(subjectId);
      setChapters(data);
    } catch (err: any) {
      setErrorChapters(extractErrorMessage(err, "Failed to load chapters."));
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Selection Handlers (Horizontal Tree / Director & Teacher View)
  const handleTreeSelectClass = (cls: ClassData) => {
    router.push(`/syllabus?classId=${cls.id}`);
  };

  const handleTreeSelectSubject = (sub: SubjectData) => {
    if (selectedClass) {
      router.push(`/syllabus?classId=${selectedClass.id}&subjectId=${sub.id}`);
    }
  };

  // Selection Handlers (Drilldown / Admin View)
  const handleAdminSelectClass = (cls: ClassData) => {
    router.push(`/syllabus?classId=${cls.id}`);
    setSubjectSearch(""); // Reset search
  };

  const handleAdminSelectSubject = (sub: SubjectData) => {
    if (activeClass) {
      router.push(`/syllabus?classId=${activeClass.id}&subjectId=${sub.id}`);
    }
    setChapterSearch(""); // Reset search
    setChapterPage(1); // Reset chapter page
  };

  const handleAdminSelectChapter = (ch: ChapterData) => {
    router.push(`/chapters/${ch.id}`);
  };

  // Delete handlers
  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this class? All linked subjects and chapters will be affected.")) return;
    try {
      await classService.delete(id);
      fetchClasses();
      if (activeClass?.id === id) {
        router.push("/syllabus");
      }
    } catch (err: any) {
      alert(extractErrorMessage(err, "Failed to delete class."));
    }
  };

  const handleDeleteSubject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this subject? All linked chapters will be deleted.")) return;
    try {
      await subjectService.delete(id);
      if (activeClass) {
        fetchSubjectsForClass(activeClass.id);
      }
      if (activeSubject?.id === id && activeClass) {
        router.push(`/syllabus?classId=${activeClass.id}`);
      }
    } catch (err: any) {
      alert(extractErrorMessage(err, "Failed to delete subject."));
    }
  };

  const handleDeleteChapter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chapter?")) return;
    try {
      await chapterService.delete(id);
      if (activeSubject) {
        fetchChaptersForSubject(activeSubject.id);
      }
      if (activeChapter?.id === id) {
        setIsContentModalOpen(false);
        setActiveChapter(null);
      }
    } catch (err: any) {
      alert(extractErrorMessage(err, "Failed to delete chapter."));
    }
  };

  // Sync NCERT Handler
  const handleSyncNcert = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingChapterId(id);
    try {
      const updatedChapter = await chapterService.syncNcert(id);
      alert("NCERT sync completed successfully!");
      if (activeSubject) {
        fetchChaptersForSubject(activeSubject.id);
      }
      // If we are looking at the content modal, sync activeChapter state
      if (activeChapter && activeChapter.id === id) {
        setActiveChapter((prev: any) => ({ ...prev, textContent: updatedChapter.textContent }));
      }
    } catch (err: any) {
      alert(extractErrorMessage(err, "Failed to sync with NCERT databases. Please try again."));
    } finally {
      setSyncingChapterId(null);
    }
  };

  if (loadingUser) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <span style={{ marginTop: "1rem" }}>Loading session details...</span>
      </div>
    );
  }

  // Filter lists based on search parameters and advanced filters
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(classSearch.toLowerCase()) ||
      cls.grade.toString().includes(classSearch) ||
      cls.section.toLowerCase().includes(classSearch.toLowerCase());

    if (!matchesSearch) return false;

    // Grade Level Filter
    if (appliedGrades.length > 0 && !appliedGrades.includes(cls.grade)) {
      return false;
    }

    // Section Filter
    if (appliedSections.length > 0 && !appliedSections.includes(cls.section)) {
      return false;
    }

    // Students Enrollment Filter
    if (appliedOnlyWithStudents && (!cls.studentsCount || cls.studentsCount === 0)) {
      return false;
    }

    return true;
  });

  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      sub.code.toLowerCase().includes(subjectSearch.toLowerCase());

    if (!matchesSearch) return false;

    // Subject Status Filter
    if (appliedStatus.length > 0) {
      const currentStatus = sub.status || "Active";
      if (!appliedStatus.includes(currentStatus)) {
        return false;
      }
    }

    return true;
  });

  const filteredChapters = chapters.filter((ch) => {
    const matchesSearch =
      ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) ||
      ch.number.toString().includes(chapterSearch);

    if (!matchesSearch) return false;

    // NCERT Sync Status Filter
    if (appliedSyncStatus.length > 0) {
      const isSynced = !!ch.textContent;
      const statusStr = isSynced ? "NCERT Synced" : "Pending Sync";
      if (!appliedSyncStatus.includes(statusStr)) {
        return false;
      }
    }

    // Only NCERT Synced Checkbox Filter
    if (appliedOnlySynced && !ch.textContent) {
      return false;
    }

    return true;
  });

  const showTableView = true;

  const getHeaderAction = () => {
    if (isSuperAdmin && !activeBoard) {
      return <Button onClick={() => setIsBoardModalOpen(true)}>Add Board</Button>;
    }
    if (user?.role === "director" && activeClass && activeSubject) {
      return <Button onClick={() => setIsChapterModalOpen(true)}>Add Chapter</Button>;
    }
    if (user?.role !== "admin" || !isSuperAdmin) return undefined;
    if (!activeClass) {
      return <Button onClick={() => setIsClassModalOpen(true)}>Add Class</Button>;
    }
    if (!activeSubject) {
      return <Button onClick={() => setIsSubjectModalOpen(true)}>Add Subject</Button>;
    }
    return <Button onClick={() => setIsChapterModalOpen(true)}>Add Chapter</Button>;
  };

  const totalClassPages = Math.ceil(filteredClasses.length / classesPerPage) || 1;
  const classStartIndex = (classPage - 1) * classesPerPage;
  const paginatedClasses = filteredClasses.slice(classStartIndex, classStartIndex + classesPerPage);

  const totalChapterPages = Math.ceil(filteredChapters.length / chaptersPerPage) || 1;
  const chapterStartIndex = (chapterPage - 1) * chaptersPerPage;
  const paginatedChapters = filteredChapters.slice(chapterStartIndex, chapterStartIndex + chaptersPerPage);

  return (
    <div style={styles.pageContainer}>
      <PageHeader
        title="Syllabus Explorer"
        description={
          showTableView
            ? undefined
            : "Explore the unified curriculum structure. Click on classes and subjects to expand details horizontally."
        }
        action={getHeaderAction()}
      />

      {/* ========================================================================= */}
      {/* 1. ADMIN DRILLDOWN VIEW (CLASSES LIST)                                    */}
      {/* ========================================================================= */}
      {showTableView && (
        <div style={styles.adminContent}>
          {/* Breadcrumb Navigation */}
          <div style={styles.breadcrumbContainer}>
            {isSuperAdmin && (
              <>
                <span
                  className={activeBoard ? "breadcrumb-link-hover" : ""}
                  style={activeBoard ? styles.breadcrumbLink : styles.breadcrumbActive}
                  onClick={() => {
                    router.push("/syllabus?tab=boards");
                  }}
                >
                  Boards
                </span>
                {activeBoard && <span style={styles.breadcrumbSeparator}>/</span>}
              </>
            )}

            {(!isSuperAdmin || activeBoard) && (
              <>
                <span
                  className={activeClass ? "breadcrumb-link-hover" : ""}
                  style={activeClass ? styles.breadcrumbLink : styles.breadcrumbActive}
                  onClick={() => {
                    if (activeClass) {
                      router.push("/syllabus");
                    }
                  }}
                >
                  {isSuperAdmin ? activeBoard : "Classes"}
                </span>
              </>
            )}
            
            {activeClass && (
              <>
                <span style={styles.breadcrumbSeparator}>/</span>
                <span
                  className={activeSubject ? "breadcrumb-link-hover" : ""}
                  style={activeSubject ? styles.breadcrumbLink : styles.breadcrumbActive}
                  onClick={() => {
                    if (activeSubject && activeClass) {
                      router.push(`/syllabus?classId=${activeClass.id}`);
                    }
                  }}
                >
                  {activeClass.name}
                </span>
              </>
            )}
            {activeSubject && (
              <>
                <span style={styles.breadcrumbSeparator}>/</span>
                <span style={styles.breadcrumbActive}>
                  {activeSubject.name}
                </span>
              </>
            )}
          </div>

          {/* Dynamic Search & Actions Toolbar */}
          <div style={styles.toolbarContainer}>
            <div style={styles.searchBarWrapper}>
              <div style={styles.searchIconWrapper}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                style={styles.toolbarInput}
                placeholder={getSearchPlaceholder()}
                value={getSearchValue()}
                onChange={handleSearchChange}
              />
            </div>
            <div style={styles.toolbarActions}>
              <button 
                style={styles.iconButton} 
                onClick={handleOpenFilters}
                title="Filter Settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                {getActiveFiltersCount() > 0 && (
                  <span style={styles.filterBadge}>{getActiveFiltersCount()}</span>
                )}
              </button>
              <button style={styles.exportBtn} onClick={() => alert("Syllabus curriculum data exported successfully!")} title="Export Curriculum">
                Export
              </button>
            </div>
          </div>

          {/* Tables Section */}
          {isSuperAdmin && !activeBoard ? (
            /* Level 0: Boards Table (Only for Super Admin when no board selected) */
            <div style={styles.tableCard} className="card animate-fade-in">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Board Name</th>
                    <th style={styles.th}>Primary Instruction Language</th>
                    <th style={styles.th}>Active Classes</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.filter(b => b.name.toLowerCase().includes(boardSearch.toLowerCase())).map((b) => (
                    <tr
                      key={b.id}
                      style={{ ...styles.tableRow, cursor: "pointer" }}
                      onClick={() => setActiveBoard(b.name)}
                    >
                      <td style={styles.td}>
                        <strong style={{ color: "var(--primary)" }}>{b.name}</strong>
                      </td>
                      <td style={styles.td_secondary}>{b.language}</td>
                      <td style={styles.td_secondary}>{b.classesCount} Classes</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: "0.2rem 0.4rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "var(--success-light)",
                          color: "var(--success)"
                        }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !activeClass ? (
            /* Level 1: Classes Table */
            <div style={styles.tableCard} className="card animate-fade-in">
              {loadingClasses ? (
                <div style={styles.loadingInner}><div className="spinner"></div>Loading classes...</div>
              ) : errorClasses ? (
                <div style={styles.errorText}>{errorClasses}</div>
              ) : filteredClasses.length === 0 ? (
                <div style={styles.emptyText}>No classes found. {isSuperAdmin && "Click Add Class to create one."}</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Class Name</th>
                      <th style={styles.th}>Grade Level</th>
                      {classes.some((c) => (c.section && c.section !== "A") || (c.studentsCount && c.studentsCount > 0)) && (
                        <th style={styles.th}>Section</th>
                      )}
                      <th style={styles.th}>Linked Students</th>
                      {isSuperAdmin && <th style={styles.th}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClasses.map((item) => (
                      <tr 
                        key={item.id} 
                        style={styles.clickableRow} 
                        className="clickable-row-hover"
                        onClick={() => handleAdminSelectClass(item)}
                      >
                        <td style={{ ...styles.td, fontWeight: 600, color: "var(--primary)" }}>{item.name}</td>
                        <td style={styles.td}>Grade {item.grade}</td>
                        {classes.some((c) => (c.section && c.section !== "A") || (c.studentsCount && c.studentsCount > 0)) && (
                          <td style={styles.td}>
                            <span style={styles.badgePrimary}>{item.section}</span>
                          </td>
                        )}
                        <td style={styles.td}>{item.studentsCount ?? 0} students</td>
                        {isSuperAdmin && (
                          <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                            <button 
                              style={styles.deleteBtn} 
                              onClick={(e) => handleDeleteClass(item.id, e)}
                              title="Delete Class"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Premium Pagination controls */}
              {filteredClasses.length > classesPerPage && (
                <div style={styles.paginationContainer}>
                  <div style={styles.paginationInfo}>
                    Showing <span style={{ fontWeight: 600 }}>{classStartIndex + 1}</span> to{" "}
                    <span style={{ fontWeight: 600 }}>
                      {Math.min(classStartIndex + classesPerPage, filteredClasses.length)}
                    </span>{" "}
                    of <span style={{ fontWeight: 600 }}>{filteredClasses.length}</span> classes
                  </div>
                  <div style={styles.paginationActions}>
                    <button
                      style={{
                        ...styles.pageBtn,
                        opacity: classPage === 1 ? 0.5 : 1,
                        cursor: classPage === 1 ? "not-allowed" : "pointer",
                      }}
                      className="pagination-btn-hover"
                      disabled={classPage === 1}
                      onClick={() => setClassPage((prev) => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    
                    <div style={styles.pageNumberContainer}>
                      {Array.from({ length: totalClassPages }, (_, idx) => {
                        const pageNum = idx + 1;
                        const isActive = classPage === pageNum;
                        return (
                          <button
                            key={pageNum}
                            style={{
                              ...styles.pageNumBtn,
                              backgroundColor: isActive ? "var(--primary)" : "transparent",
                              color: isActive ? "#ffffff" : "var(--text-secondary)",
                              borderColor: isActive ? "var(--primary)" : "var(--border-color)",
                              fontWeight: isActive ? 600 : 400,
                            }}
                            className={!isActive ? "page-num-hover" : ""}
                            onClick={() => setClassPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      style={{
                        ...styles.pageBtn,
                        opacity: classPage === totalClassPages ? 0.5 : 1,
                        cursor: classPage === totalClassPages ? "not-allowed" : "pointer",
                      }}
                      className="pagination-btn-hover"
                      disabled={classPage === totalClassPages}
                      onClick={() => setClassPage((prev) => Math.min(prev + 1, totalClassPages))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !activeSubject ? (
            /* Level 2: Subjects Table */
            <div style={styles.tableCard} className="card animate-fade-in">
              {loadingSubjects ? (
                <div style={styles.loadingInner}><div className="spinner"></div>Loading subjects...</div>
              ) : errorSubjects ? (
                <div style={styles.errorText}>{errorSubjects}</div>
              ) : filteredSubjects.length === 0 ? (
                <div style={styles.emptyText}>No subjects configured for this class. {isSuperAdmin && "Click Add Subject to link one."}</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Subject Name</th>
                      <th style={styles.th}>Subject Code</th>
                      <th style={styles.th}>Status</th>
                      {isSuperAdmin && <th style={styles.th}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((item) => (
                      <tr
                        key={item.id}
                        style={styles.clickableRow}
                        className="clickable-row-hover"
                        onClick={() => handleAdminSelectSubject(item)}
                      >
                        <td style={{ ...styles.td, fontWeight: 600, color: "var(--primary)" }} className={isHindiText(item.name) || item.name.toLowerCase() === "hindi" ? "font-hindi" : ""}>{item.name}</td>
                        <td style={styles.td}>{item.code}</td>
                        <td style={styles.td}>
                          <span style={styles.badgeSuccess}>{item.status || "Active"}</span>
                        </td>
                        {isSuperAdmin && (
                          <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                            <button 
                              style={styles.deleteBtn} 
                              onClick={(e) => handleDeleteSubject(item.id, e)}
                              title="Delete Subject"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Level 3: Chapters Table */
            <div style={styles.tableCard} className="card animate-fade-in">
              {loadingChapters ? (
                <div style={styles.loadingInner}><div className="spinner"></div>Loading chapters...</div>
              ) : errorChapters ? (
                <div style={styles.errorText}>{errorChapters}</div>
              ) : filteredChapters.length === 0 ? (
                <div style={styles.emptyText}>No chapters uploaded. {isSuperAdmin && "Click Add Chapter to create one."}</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={{ ...styles.th, whiteSpace: "nowrap" }}>Ch No.</th>
                      <th style={styles.th}>Chapter Title</th>
                      <th style={styles.th}>NCERT Sync</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedChapters.map((item) => (
                      <tr
                        key={item.id}
                        style={styles.clickableRow}
                        className="clickable-row-hover"
                        onClick={() => handleAdminSelectChapter(item)}
                      >
                        <td style={{ ...styles.td, fontWeight: 700, width: "80px", whiteSpace: "nowrap" }}>Ch {item.number}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }} className={isHindiText(item.title) || selectedSubject?.name?.toLowerCase() === "hindi" ? "font-hindi" : ""}>{item.title}</td>
                        <td style={styles.td}>
                          <span style={item.textContent ? styles.badgeSuccess : styles.badgeWarning}>
                            {item.textContent ? "NCERT Synced" : "Pending Sync"}
                          </span>
                        </td>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                            <Link
                              href={`/chapters/${item.id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textDecoration: "none",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                height: "32px",
                                padding: "0 10px",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                                fontWeight: 500,
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              className="interactive-element"
                              title="Read textbook content"
                            >
                              Read
                            </Link>
                            {!item.tenantId && (
                              <Button 
                                size="sm" 
                                variant={item.textContent ? "secondary" : "primary"}
                                onClick={(e) => handleSyncNcert(item.id, e)}
                                loading={syncingChapterId === item.id}
                              >
                                Sync NCERT
                              </Button>
                            )}
                            {(isSuperAdmin || (user?.role === "director" && item.tenantId)) && (
                              <button 
                                style={styles.deleteBtn} 
                                onClick={(e) => handleDeleteChapter(item.id, e)}
                                title="Delete Chapter"
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
                    ))}
                  </tbody>
                </table>
              )}

              {/* Premium Pagination controls */}
              {filteredChapters.length > chaptersPerPage && (
                <div style={styles.paginationContainer}>
                  <div style={styles.paginationInfo}>
                    Showing <span style={{ fontWeight: 600 }}>{chapterStartIndex + 1}</span> to{" "}
                    <span style={{ fontWeight: 600 }}>
                      {Math.min(chapterStartIndex + chaptersPerPage, filteredChapters.length)}
                    </span>{" "}
                    of <span style={{ fontWeight: 600 }}>{filteredChapters.length}</span> chapters
                  </div>
                  <div style={styles.paginationActions}>
                    <button
                      style={{
                        ...styles.pageBtn,
                        opacity: chapterPage === 1 ? 0.5 : 1,
                        cursor: chapterPage === 1 ? "not-allowed" : "pointer",
                      }}
                      className="pagination-btn-hover"
                      disabled={chapterPage === 1}
                      onClick={() => setChapterPage((prev) => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    
                    <div style={styles.pageNumberContainer}>
                      {Array.from({ length: totalChapterPages }, (_, idx) => {
                        const pageNum = idx + 1;
                        const isActive = chapterPage === pageNum;
                        return (
                          <button
                            key={pageNum}
                            style={{
                              ...styles.pageNumBtn,
                              backgroundColor: isActive ? "var(--primary)" : "transparent",
                              color: isActive ? "#ffffff" : "var(--text-secondary)",
                              borderColor: isActive ? "var(--primary)" : "var(--border-color)",
                              fontWeight: isActive ? 600 : 400,
                            }}
                            className={!isActive ? "page-num-hover" : ""}
                            onClick={() => setChapterPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      style={{
                        ...styles.pageBtn,
                        opacity: chapterPage === totalChapterPages ? 0.5 : 1,
                        cursor: chapterPage === totalChapterPages ? "not-allowed" : "pointer",
                      }}
                      className="pagination-btn-hover"
                      disabled={chapterPage === totalChapterPages}
                      onClick={() => setChapterPage((prev) => Math.min(prev + 1, totalChapterPages))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DIRECTORS/TEACHERS HORIZONTAL TREE DIAGRAM                             */}
      {/* ========================================================================= */}
      {!showTableView && (
        <div style={styles.treeContainer}>
          {/* Column 1: Classes */}
          <div style={styles.treeColumn}>
            <div style={styles.columnHeader}>Classes ({filteredClasses.length})</div>
            <div style={styles.nodesWrapper}>
              {loadingClasses ? (
                <div style={styles.loadingInner}><div className="spinner"></div></div>
              ) : errorClasses ? (
                <div style={styles.errorText}>{errorClasses}</div>
              ) : filteredClasses.length === 0 ? (
                <div style={styles.placeholderCard}>No classes found matching active filters.</div>
              ) : filteredClasses.map((item) => {
                const isActive = selectedClass?.id === item.id;
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleTreeSelectClass(item)}
                    style={{
                      ...styles.nodeCard,
                      borderColor: isActive ? "var(--primary)" : "var(--border-color)",
                      backgroundColor: isActive ? "var(--primary-light)" : "var(--bg-surface)",
                      boxShadow: isActive ? "var(--shadow-md)" : "var(--shadow-sm)",
                    }}
                    className="interactive-element"
                  >
                    <div style={styles.nodeCardTitle}>{item.name}</div>
                    <div style={styles.nodeCardSub}>
                      Grade Level: {item.grade}
                      {Boolean((item.section && item.section !== "A") || (item.studentsCount && item.studentsCount > 0)) && ` • Sec ${item.section}`}
                    </div>
                    <div style={styles.nodeCardSub}>{item.studentsCount ?? 0} Students</div>
                    
                    {/* Horizontal connection dot right */}
                    <div style={{
                      ...styles.connectionDotRight,
                      backgroundColor: isActive ? "var(--primary)" : "var(--text-muted)"
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Subjects */}
          <div style={styles.treeColumn}>
            <div style={styles.columnHeader}>Subjects ({filteredSubjects.length})</div>
            <div style={styles.nodesWrapper}>
              {!selectedClass ? (
                <div style={styles.placeholderCard}>Select a Class node from the left to view academic subjects.</div>
              ) : loadingSubjects ? (
                <div style={styles.loadingInner}><div className="spinner"></div></div>
              ) : errorSubjects ? (
                <div style={styles.errorText}>{errorSubjects}</div>
              ) : filteredSubjects.length === 0 ? (
                <div style={styles.placeholderCard}>No academic subjects configured matching active filters.</div>
              ) : filteredSubjects.map((item) => {
                const isActive = selectedSubject?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleTreeSelectSubject(item)}
                    style={{
                      ...styles.nodeCard,
                      borderColor: isActive ? "var(--secondary)" : "var(--border-color)",
                      backgroundColor: isActive ? "var(--secondary-light)" : "var(--bg-surface)",
                      boxShadow: isActive ? "var(--shadow-md)" : "var(--shadow-sm)",
                    }}
                    className="interactive-element"
                  >
                    {/* Horizontal connection dot left */}
                    <div style={styles.connectionDotLeft} />

                    <div style={styles.nodeCardTitle} className={isHindiText(item.name) || item.name.toLowerCase() === "hindi" ? "font-hindi" : ""}>{item.name}</div>
                    <div style={styles.nodeCardSub}>Code: {item.code}</div>
                    
                    {/* Horizontal connection dot right */}
                    <div style={{
                      ...styles.connectionDotRight,
                      backgroundColor: isActive ? "var(--secondary)" : "var(--text-muted)"
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Chapters */}
          <div style={styles.treeColumn}>
            <div style={styles.columnHeader}>Chapters ({filteredChapters.length})</div>
            <div style={styles.nodesWrapper}>
              {!selectedSubject ? (
                <div style={styles.placeholderCard}>Select a Subject node to reveal its curriculum chapters.</div>
              ) : loadingChapters ? (
                <div style={styles.loadingInner}><div className="spinner"></div></div>
              ) : errorChapters ? (
                <div style={styles.errorText}>{errorChapters}</div>
              ) : filteredChapters.length === 0 ? (
                <div style={styles.placeholderCard}>No syllabus chapters uploaded matching active filters.</div>
              ) : filteredChapters.map((item) => (
                <div
                   key={item.id}
                  style={styles.chapterNodeCard}
                  className="interactive-element"
                >
                  {/* Horizontal connection dot left */}
                  <div style={styles.connectionDotLeft} />

                  <div style={styles.chapterNodeHeader}>
                    <span style={styles.chapterNodeNum}>Ch {item.number}</span>
                    {item.textContent && <span style={styles.badgeSuccessSmall}>NCERT</span>}
                  </div>
                  <div style={styles.chapterNodeTitle} className={isHindiText(item.title) || selectedSubject?.name?.toLowerCase() === "hindi" ? "font-hindi" : ""}>{item.title}</div>
                  <div style={styles.chapterNodeContent} className={isHindiText(item.title) || selectedSubject?.name?.toLowerCase() === "hindi" ? "font-hindi" : ""}>
                    {item.content ? item.content.substring(0, 80) + "..." : "No textbook contents."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CRUD CREATE MODALS                                                     */}
      {/* ========================================================================= */}
      
      {/* Create Board Modal */}
      <Modal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        title="Register Education Board"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newBoardName) return;
            setBoards((prev) => [
              ...prev,
              {
                id: newBoardName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                name: newBoardName,
                language: newBoardLanguage,
                status: "Active",
                classesCount: 0,
              },
            ]);
            setNewBoardName("");
            setIsBoardModalOpen(false);
          }}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <Input
            label="Board Name"
            type="text"
            required
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="e.g. CBSE, ICSE, State Board"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Instruction Language</label>
            <select
              value={newBoardLanguage}
              onChange={(e) => setNewBoardLanguage(e.target.value)}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                outline: "none",
              }}
            >
              <option value="English">English</option>
              <option value="English / Hindi">English / Hindi</option>
              <option value="Regional Languages">Regional Languages</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={() => setIsBoardModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register Board
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Class Modal */}
      <Modal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        title="Create New Class"
      >
        <ClassForm
          onSuccess={() => {
            setIsClassModalOpen(false);
            fetchClasses();
          }}
          onCancel={() => setIsClassModalOpen(false)}
        />
      </Modal>

      {/* Create Subject Modal */}
      <Modal 
        isOpen={isSubjectModalOpen} 
        onClose={() => setIsSubjectModalOpen(false)} 
        title={`Add Subject for ${activeClass?.name}`}
      >
        <SubjectForm
          defaultClassId={activeClass?.id}
          onSuccess={() => {
            setIsSubjectModalOpen(false);
            if (activeClass) fetchSubjectsForClass(activeClass.id);
          }}
          onCancel={() => setIsSubjectModalOpen(false)}
        />
      </Modal>

      {/* Create Chapter Modal */}
      <Modal 
        isOpen={isChapterModalOpen} 
        onClose={() => setIsChapterModalOpen(false)} 
        title={`Add Chapter for ${activeSubject?.name}`}
      >
        <ChapterForm
          defaultSubjectId={activeSubject?.id}
          onSuccess={() => {
            setIsChapterModalOpen(false);
            if (activeSubject) fetchChaptersForSubject(activeSubject.id);
          }}
          onCancel={() => setIsChapterModalOpen(false)}
        />
      </Modal>

      {/* ========================================================================= */}
      {/* 4. ADMIN DRILLDOWN OVERLAY MODALS                                         */}
      {/* ========================================================================= */}



      {/* Chapter Content Modal */}
      <Modal
        isOpen={isContentModalOpen}
        onClose={() => setIsContentModalOpen(false)}
        title={activeChapter?.title || "Curriculum Chapter Content"}
      >
        <div style={styles.modalContent}>
          <div style={styles.chapterDetailsHeader}>
            <span style={styles.chapterHeaderNo}>Chapter {activeChapter?.number}</span>
            {activeChapter?.textContent ? (
              <span style={styles.badgeSuccess}>NCERT Synced</span>
            ) : (
              <span style={styles.badgeWarning}>Pending Sync</span>
            )}
          </div>

          <div style={styles.contentBody}>
            {activeChapter?.content || activeChapter?.textContent ? (
              <div style={styles.textPaper}>
                {activeChapter.content || activeChapter.textContent}
              </div>
            ) : (
              <div style={styles.emptyText}>
                No textbook contents uploaded or synced for this chapter.
                <div style={{ marginTop: "1rem" }}>
                  <Button
                    onClick={(e) => activeChapter && handleSyncNcert(activeChapter.id, e)}
                    loading={syncingChapterId === activeChapter?.id}
                  >
                    Sync Textbook from NCERT Servers
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. CUSTOM PREMIUM FILTERS MODAL                                           */}
      {/* ========================================================================= */}
      {isFilterModalOpen && (() => {
        const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))).sort((a, b) => Number(a) - Number(b));
        const sectionOptions = Array.from(new Set(classes.map((c) => c.section))).sort();
        const statusOptions = ["Active", "Inactive"];
        const syncStatusOptions = ["NCERT Synced", "Pending Sync"];

        return (
          <div style={styles.filterModalOverlay} onClick={() => setIsFilterModalOpen(false)}>
            {/* Blocker click-capture to close open dropdowns if user clicks elsewhere inside the modal */}
            {openDropdown && (
              <div 
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                  backgroundColor: "transparent",
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(null);
                }} 
              />
            )}

            <div style={styles.filterModalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.filterModalHeader}>
                <h2 style={styles.filterModalTitle}>Filters</h2>
                <button 
                  style={styles.filterModalCloseBtn} 
                  className="filter-close-btn-hover"
                  onClick={() => setIsFilterModalOpen(false)}
                >
                  Close
                </button>
              </div>
              
              <div style={styles.filterModalDivider} />
              
              <p style={styles.filterModalSubtitle}>
                Pick a record to filter. New entries land in the relevant module and appear instantly across the workspace.
              </p>

              <div style={styles.filterModalBody}>
                {/* 1. Grade level */}
                <div style={styles.filterFieldGroup}>
                  <label style={styles.filterFieldLabel}>Grade level</label>
                  <div 
                    style={styles.customSelectContainer} 
                    className="custom-select-container-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown("grade");
                    }}
                  >
                    {tempGrades.length === 0 ? (
                      <span style={styles.customSelectPlaceholder}>Click to select</span>
                    ) : (
                      <div style={styles.customSelectPillsContainer}>
                        {tempGrades.map((grade) => (
                          <span 
                            key={grade} 
                            style={styles.customSelectPillBlue}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Grade {grade}
                            <span 
                              style={styles.customSelectPillRemove} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGrade(grade);
                              }}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" style={styles.customSelectArrow}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    
                    {openDropdown === "grade" && (
                      <div style={styles.customSelectDropdown}>
                        {gradeOptions.length === 0 ? (
                          <div style={styles.customSelectDropdownItemEmpty}>No grades found</div>
                        ) : (
                          gradeOptions.map((grade) => {
                            const isSelected = tempGrades.includes(grade);
                            return (
                              <div 
                                key={grade} 
                                style={{
                                  ...styles.customSelectDropdownItem,
                                  backgroundColor: isSelected ? "var(--primary-light)" : "transparent",
                                  fontWeight: isSelected ? 600 : 400,
                                }}
                                className="custom-select-item-hover"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGrade(grade);
                                }}
                              >
                                Grade {grade}
                                {isSelected && <span style={{ marginLeft: "auto", color: "var(--primary)" }}>✓</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Section */}
                <div style={styles.filterFieldGroup}>
                  <label style={styles.filterFieldLabel}>Section</label>
                  <div 
                    style={styles.customSelectContainer} 
                    className="custom-select-container-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown("section");
                    }}
                  >
                    {tempSections.length === 0 ? (
                      <span style={styles.customSelectPlaceholder}>Click to select</span>
                    ) : (
                      <div style={styles.customSelectPillsContainer}>
                        {tempSections.map((sec) => (
                          <span 
                            key={sec} 
                            style={styles.customSelectPillGreen}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Section {sec}
                            <span 
                              style={styles.customSelectPillRemove} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(sec);
                              }}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" style={styles.customSelectArrow}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    
                    {openDropdown === "section" && (
                      <div style={styles.customSelectDropdown}>
                        {sectionOptions.length === 0 ? (
                          <div style={styles.customSelectDropdownItemEmpty}>No sections found</div>
                        ) : (
                          sectionOptions.map((sec) => {
                            const isSelected = tempSections.includes(sec);
                            return (
                              <div 
                                key={sec} 
                                style={{
                                  ...styles.customSelectDropdownItem,
                                  backgroundColor: isSelected ? "var(--success-light)" : "transparent",
                                  fontWeight: isSelected ? 600 : 400,
                                }}
                                className="custom-select-item-hover"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSection(sec);
                                }}
                              >
                                Section {sec}
                                {isSelected && <span style={{ marginLeft: "auto", color: "var(--success)" }}>✓</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Select only with students */}
                  <div style={{ marginTop: "0.25rem" }}>
                    <CustomCheckbox 
                      checked={tempOnlyWithStudents} 
                      onChange={setTempOnlyWithStudents} 
                      label="Select only with students" 
                    />
                  </div>
                </div>

                {/* 3. Subject status */}
                <div style={styles.filterFieldGroup}>
                  <label style={styles.filterFieldLabel}>Subject status</label>
                  <div 
                    style={styles.customSelectContainer} 
                    className="custom-select-container-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown("status");
                    }}
                  >
                    {tempStatus.length === 0 ? (
                      <span style={styles.customSelectPlaceholder}>Click to select</span>
                    ) : (
                      <div style={styles.customSelectPillsContainer}>
                        {tempStatus.map((status) => (
                          <span 
                            key={status} 
                            style={styles.customSelectPillPurple}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {status}
                            <span 
                              style={styles.customSelectPillRemove} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus(status);
                              }}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" style={styles.customSelectArrow}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    
                    {openDropdown === "status" && (
                      <div style={styles.customSelectDropdown}>
                        {statusOptions.map((status) => {
                          const isSelected = tempStatus.includes(status);
                          return (
                            <div 
                              key={status} 
                              style={{
                                ...styles.customSelectDropdownItem,
                                backgroundColor: isSelected ? "var(--primary-light)" : "transparent",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                              className="custom-select-item-hover"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStatus(status);
                              }}
                            >
                              {status}
                              {isSelected && <span style={{ marginLeft: "auto", color: "var(--primary)" }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. NCERT sync status */}
                <div style={styles.filterFieldGroup}>
                  <label style={styles.filterFieldLabel}>NCERT sync status</label>
                  <div 
                    style={styles.customSelectContainer} 
                    className="custom-select-container-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown("sync");
                    }}
                  >
                    {tempSyncStatus.length === 0 ? (
                      <span style={styles.customSelectPlaceholder}>Click to select</span>
                    ) : (
                      <div style={styles.customSelectPillsContainer}>
                        {tempSyncStatus.map((sync) => (
                          <span 
                            key={sync} 
                            style={styles.customSelectPillYellow}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {sync}
                            <span 
                              style={styles.customSelectPillRemove} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSyncStatus(sync);
                              }}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" style={styles.customSelectArrow}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    
                    {openDropdown === "sync" && (
                      <div style={styles.customSelectDropdown}>
                        {syncStatusOptions.map((sync) => {
                          const isSelected = tempSyncStatus.includes(sync);
                          return (
                            <div 
                              key={sync} 
                              style={{
                                ...styles.customSelectDropdownItem,
                                backgroundColor: isSelected ? "var(--warning-light)" : "transparent",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                              className="custom-select-item-hover"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSyncStatus(sync);
                              }}
                            >
                              {sync}
                              {isSelected && <span style={{ marginLeft: "auto", color: "var(--warning)" }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Select only synced */}
                  <div style={{ marginTop: "0.25rem" }}>
                    <CustomCheckbox 
                      checked={tempOnlySynced} 
                      onChange={setTempOnlySynced} 
                      label="Select only synced" 
                    />
                  </div>
                </div>
              </div>

              <div style={styles.filterModalFooterActions}>
                <button 
                  style={styles.filterModalSubmitBtn} 
                  className="filter-submit-btn-hover"
                  onClick={handleApplyFilters}
                >
                  Filter
                </button>
                <button 
                  style={styles.filterModalResetBtn} 
                  className="filter-reset-btn-hover"
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "1rem 0",
    minHeight: "100%",
  },
  loadingContainer: {
    padding: "5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
  },
  loadingInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    gap: "1rem",
    color: "var(--text-secondary)",
  },
  errorText: {
    color: "var(--error)",
    backgroundColor: "var(--error-light)",
    padding: "1rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    margin: "1rem 0",
  },
  emptyText: {
    padding: "4rem",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "1rem",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
  },
  adminContent: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  searchBarContainer: {
    maxWidth: "500px",
  },
  tableCard: {
    padding: 0,
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  tableHeaderRow: {
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
  clickableRow: {
    borderBottom: "1px solid var(--border-color)",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  row: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "1.1rem 1.5rem",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
  },
  badgePrimary: {
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
    backgroundColor: "var(--primary-light)",
    color: "var(--primary)",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  badgeSuccess: {
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  badgeSuccessSmall: {
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    fontWeight: 700,
    fontSize: "0.7rem",
  },
  badgeWarning: {
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
    backgroundColor: "var(--warning-light)",
    color: "var(--warning)",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  deleteBtn: {
    color: "var(--error)",
    border: "none",
    background: "none",
    cursor: "pointer",
    padding: "0.3rem",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },

  // Modal-specific styles for drilldown lists
  modalContent: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    maxHeight: "80vh",
  },
  modalActionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  modalTableWrapper: {
    overflowY: "auto",
    maxHeight: "450px",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
  },
  chapterDetailsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.8rem",
    marginBottom: "0.5rem",
  },
  chapterHeaderNo: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--primary)",
  },
  contentBody: {
    maxHeight: "500px",
    overflowY: "auto",
    padding: "0.5rem 0",
  },
  textPaper: {
    padding: "1.5rem",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    border: "1px solid var(--border-color)",
    maxHeight: "400px",
    overflowY: "auto",
  },

  // Tree styling (Horizontal Tree View)
  treeContainer: {
    display: "flex",
    gap: "2.5rem",
    padding: "1rem 0",
    overflowX: "auto",
    alignItems: "flex-start",
    width: "100%",
  },
  treeColumn: {
    flex: "1",
    minWidth: "300px",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    backgroundColor: "var(--bg-surface-hover)",
    padding: "1.5rem 1.2rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow-sm)",
  },
  columnHeader: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    borderBottom: "2px solid var(--border-color)",
    paddingBottom: "0.6rem",
  },
  nodesWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "0.4rem",
  },
  nodeCard: {
    padding: "1.2rem",
    borderRadius: "var(--radius-sm)",
    border: "2px solid",
    cursor: "pointer",
    position: "relative",
    transition: "all var(--transition-fast)",
  },
  nodeCardTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.3rem",
  },
  nodeCardSub: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  placeholderCard: {
    padding: "2.5rem 1.5rem",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg-surface)",
  },
  connectionDotRight: {
    position: "absolute",
    right: "-7px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "2px solid var(--bg-surface)",
    zIndex: 10,
    transition: "background-color 0.2s",
  },
  connectionDotLeft: {
    position: "absolute",
    left: "-7px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "2px solid var(--bg-surface)",
    backgroundColor: "var(--text-muted)",
    zIndex: 10,
  },

  // Chapter Node Specific
  chapterNodeCard: {
    padding: "1.2rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "var(--shadow-sm)",
    position: "relative",
    transition: "all var(--transition-fast)",
  },
  chapterNodeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.4rem",
  },
  chapterNodeNum: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--primary)",
  },
  chapterNodeTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.4rem",
  },
  chapterNodeContent: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
  },
  breadcrumbContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "0.5rem",
  },
  breadcrumbLink: {
    color: "var(--primary)",
    cursor: "pointer",
    transition: "color 0.2s ease",
  },
  breadcrumbSeparator: {
    color: "var(--text-muted)",
    padding: "0 0.2rem",
  },
  breadcrumbActive: {
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  thPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    backgroundColor: "var(--bg-app)",
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
    whiteSpace: "nowrap",
  },
  checkboxDecorative: {
    width: "18px",
    height: "18px",
    border: "2px solid var(--border-color)",
    borderRadius: "6px",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "border-color var(--transition-fast)",
  },
  checkboxDecorativeHeader: {
    width: "18px",
    height: "18px",
    border: "2px solid var(--text-muted)",
    borderRadius: "6px",
    backgroundColor: "transparent",
    opacity: 0.6,
  },
  tdCheckbox: {
    padding: "1.1rem 1.5rem",
    width: "50px",
    verticalAlign: "middle",
  },
  thCheckbox: {
    padding: "0.8rem 1.5rem",
    width: "50px",
    verticalAlign: "middle",
  },
  toolbarContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
    width: "100%",
  },
  searchBarWrapper: {
    position: "relative",
    flex: "1",
    maxWidth: "400px",
  },
  searchIconWrapper: {
    position: "absolute",
    left: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  toolbarInput: {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    boxShadow: "var(--shadow-sm)",
    outline: "none",
    transition: "all var(--transition-fast)",
  },
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  iconButton: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  filterBadge: {
    position: "absolute",
    top: "-5px",
    right: "-5px",
    backgroundColor: "var(--primary)",
    color: "white",
    fontSize: "0.7rem",
    fontWeight: "bold",
    borderRadius: "50%",
    width: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--bg-surface)",
  },
  exportBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.5rem 1.25rem",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },

  // Premium Filters Custom Styles
  filterModalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)", // soft grey-blue overlay
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    backdropFilter: "blur(4px)",
  },
  filterModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    width: "480px",
    maxWidth: "95%",
    padding: "2rem",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    position: "relative",
  },
  filterModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterModalTitle: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#1E293B", // dark blue
    margin: 0,
  },
  filterModalCloseBtn: {
    backgroundColor: "#F0F2FD",
    color: "#5C6BE6",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "0.5rem 1.25rem",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  filterModalDivider: {
    height: "1px",
    backgroundColor: "#E2E8F0",
    margin: "0 -2rem",
  },
  filterModalSubtitle: {
    fontSize: "0.85rem",
    color: "#94A3B8",
    lineHeight: "1.5",
    margin: 0,
  },
  filterModalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  filterFieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  filterFieldLabel: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#475569",
  },
  customSelectContainer: {
    position: "relative",
    width: "100%",
    minHeight: "48px",
    borderRadius: "16px",
    border: "1px solid #E2E8F0",
    padding: "6px 40px 6px 16px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  customSelectPlaceholder: {
    color: "#94A3B8",
    fontSize: "0.95rem",
  },
  customSelectPillsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  customSelectPillBlue: {
    backgroundColor: "#EBF2FF",
    color: "#2F80ED",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  customSelectPillGreen: {
    backgroundColor: "#E6F9F3",
    color: "#10B981",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  customSelectPillPurple: {
    backgroundColor: "#F3F1FF",
    color: "#8B7CFB",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  customSelectPillYellow: {
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  customSelectPillRemove: {
    cursor: "pointer",
    fontSize: "1.1rem",
    fontWeight: "bold",
    lineHeight: "1",
    marginLeft: "2px",
  },
  customSelectArrow: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  customSelectDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    border: "1px solid #E2E8F0",
    borderRadius: "16px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
    zIndex: 1010,
    maxHeight: "180px",
    overflowY: "auto",
    padding: "6px 0",
  },
  customSelectDropdownItem: {
    padding: "10px 16px",
    fontSize: "0.95rem",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  customSelectDropdownItemEmpty: {
    padding: "12px 16px",
    fontSize: "0.95rem",
    color: "#94A3B8",
    textAlign: "center",
  },
  filterModalFooterActions: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1rem",
    justifyContent: "flex-start",
  },
  filterModalSubmitBtn: {
    backgroundColor: "#2F80ED", // Royal blue matching mockup
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.95rem",
    padding: "0.75rem 2rem",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  filterModalResetBtn: {
    backgroundColor: "#F0F2FD",
    color: "#5C6BE6",
    fontWeight: 600,
    fontSize: "0.95rem",
    padding: "0.75rem 2rem",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  paginationContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    borderTop: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    borderBottomLeftRadius: "var(--radius-md)",
    borderBottomRightRadius: "var(--radius-md)",
  },
  paginationInfo: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  paginationActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  pageBtn: {
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    backgroundColor: "transparent",
    transition: "all 0.15s ease",
  },
  pageNumberContainer: {
    display: "flex",
    gap: "0.25rem",
  },
  pageNumBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};

export default function SyllabusPage() {
  return (
    <Suspense fallback={
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <span style={{ marginTop: "1rem" }}>Loading syllabus explorer...</span>
      </div>
    }>
      <SyllabusPageContent />
    </Suspense>
  );
}
