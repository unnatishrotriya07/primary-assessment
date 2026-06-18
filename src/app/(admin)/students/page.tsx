"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import classService from "@/services/class.service";
import studentService from "@/services/student.service";
import { ClassData } from "@/types/class.types";
import { StudentData, StudentResult } from "@/types/student.types";
import { extractErrorMessage } from "@/utils/helpers";

// Main workspace component that consumes search params
function StudentsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const classIdParam = searchParams.get("classId");
  const studentIdParam = searchParams.get("studentId");

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  // Student list view states
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Student profile view states
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);

  // Loading & error states
  const [classesLoading, setClassesLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadClassId, setUploadClassId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const openUploadModal = (clsId?: string) => {
    setUploadClassId(clsId || "");
    setUploadFile(null);
    setUploadError("");
    setUploadSuccess("");
    setUploadModalOpen(true);
  };

  // Student edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editScholarNum, setEditScholarNum] = useState("");
  const [editPicFile, setEditPicFile] = useState<File | null>(null);
  const [editPicPreview, setEditPicPreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "results">("profile");

  // 1. Load classes at startup
  const loadClasses = async () => {
    setClassesLoading(true);
    setErrorMsg("");
    try {
      const data = await classService.getAll();
      setClasses(data);
    } catch (err: any) {
      setErrorMsg(extractErrorMessage(err, "Failed to load classes."));
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // 2. Load students roster if classIdParam changes
  useEffect(() => {
    if (classIdParam) {
      const fetchRoster = async () => {
        setStudentsLoading(true);
        setErrorMsg("");
        setStudents([]);
        setCurrentPage(1);
        try {
          const data = await studentService.getByClass(classIdParam);
          setStudents(data);
          // Find matching class name
          const matched = classes.find(c => String(c.id) === classIdParam);
          if (matched) {
            setSelectedClass(matched);
          } else {
            // Fetch single class detail if not loaded in array yet
            try {
              const singleCls = await classService.getById(classIdParam);
              setSelectedClass(singleCls);
            } catch (e) { }
          }
        } catch (err: any) {
          setErrorMsg(extractErrorMessage(err, "Failed to load class roster."));
        } finally {
          setStudentsLoading(false);
        }
      };
      fetchRoster();
    } else {
      setSelectedClass(null);
      setStudents([]);
    }
  }, [classIdParam, classes]);

  // 3. Load student profile if studentIdParam changes
  useEffect(() => {
    if (studentIdParam) {
      const fetchProfile = async () => {
        setProfileLoading(true);
        setResultsLoading(true);
        setErrorMsg("");
        setActiveStudent(null);
        setStudentResults([]);
        setEditPicFile(null);
        setEditError("");
        setEditSuccess("");

        try {
          const student = await studentService.getById(studentIdParam);
          setActiveStudent(student);
          setEditName(student.name);
          setEditEmail(student.email);
          setEditContact(student.contactNumber || "");
          setEditScholarNum(student.scholarNumber);
          setEditPicPreview(student.pictureUrl || null);

          // Fetch outcomes results
          const results = await studentService.getResults(studentIdParam);
          setStudentResults(results);
        } catch (err: any) {
          setErrorMsg(extractErrorMessage(err, "Failed to load student profile details."));
        } finally {
          setProfileLoading(false);
          setResultsLoading(false);
        }
      };
      fetchProfile();
    } else {
      setActiveStudent(null);
      setStudentResults([]);
    }
  }, [studentIdParam]);

  // Handle excel upload submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClassId || !uploadFile) {
      setUploadError("Please select a class and an Excel/CSV file.");
      return;
    }
    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      const res = await studentService.uploadExcel(uploadClassId, uploadFile);
      setUploadSuccess(res.message || "Roster imported successfully!");
      loadClasses(); // Refresh class roster student counts

      // Reload active students list if we're currently viewing that class
      if (classIdParam === uploadClassId) {
        const data = await studentService.getByClass(uploadClassId);
        setStudents(data);
      }
      setTimeout(() => setUploadModalOpen(false), 2000);
    } catch (err: any) {
      setUploadError(extractErrorMessage(err, "Excel import failed. Check file column schema."));
    } finally {
      setUploadLoading(false);
    }
  };

  // Profile picture file selector
  const handlePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditPicFile(file);
      setEditPicPreview(URL.createObjectURL(file));
    }
  };

  // Submit profile edits
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    setEditLoading(true);
    setEditError("");
    setEditSuccess("");

    try {
      let updatedStudent = activeStudent;

      // 1. Upload new picture if chosen
      if (editPicFile) {
        try {
          updatedStudent = await studentService.uploadPicture(activeStudent.id, editPicFile);
        } catch (s3Err: any) {
          throw new Error(s3Err.response?.data?.detail || "Failed to upload new profile picture to AWS S3. Verify configurations.");
        }
      }

      // 2. Save core details
      const payload: Partial<StudentData> = {
        name: editName,
        email: editEmail,
        contactNumber: editContact,
        scholarNumber: editScholarNum,
        pictureUrl: updatedStudent.pictureUrl, // preserve new picture URL
      };

      const res = await studentService.update(activeStudent.id, payload);
      setEditSuccess("Profile updated successfully!");
      setActiveStudent(res);

      // Refresh class roster student list in memory
      if (classIdParam) {
        const refreshed = await studentService.getByClass(classIdParam);
        setStudents(refreshed);
      }
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Failed to save profile changes."));
    } finally {
      setEditLoading(false);
    }
  };

  // Filter roster list based on user search term
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scholarNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination indexing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "?";
    const parts = nameStr.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return nameStr.substring(0, 2).toUpperCase();
  };

  // RENDER VIEW 3: Student Profile View
  if (studentIdParam) {
    if (profileLoading) {
      return (
        <div style={styles.centerLoading}>
          <div className="spinner" style={{ marginBottom: "1rem" }} />
          Loading student profile file...
        </div>
      );
    }

    if (!activeStudent) {
      return (
        <div style={styles.container}>
          <Button onClick={() => router.push(classIdParam ? `/students?classId=${classIdParam}` : "/students")} variant="secondary" size="sm">
            ← Back to roster
          </Button>
          <div style={styles.emptyState}>Student profile not found or access denied.</div>
        </div>
      );
    }

    return (
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.profileHeader}>
          <Button
            onClick={() => router.push(`/students?classId=${activeStudent.classId}`)}
            variant="secondary"
            size="sm"
            style={{ width: "fit-content" }}
          >
            ← Back to Class Roster
          </Button>
          <PageHeader
            title={activeStudent.name}
            description={`Scholar No: ${activeStudent.scholarNumber} • Profile dossier and assessment results.`}
          />
        </div>

        <div style={styles.profileGrid}>
          {/* Left Column: Editable Details Form */}
          <div style={styles.profileCol} className="card">
            <h3 style={styles.sectionTitle}>Personal Details</h3>
            <form onSubmit={handleEditSubmit} style={styles.form}>
              {editError && <div style={styles.errorText}>{editError}</div>}
              {editSuccess && <div style={styles.successText}>{editSuccess}</div>}

              <div style={styles.photoContainerWrapper}>
                <div style={styles.photoContainer}>
                  {editPicPreview ? (
                    <img src={editPicPreview} alt="Student Profile" style={styles.profileLargePhoto} />
                  ) : (
                    <div style={styles.fallbackLargePhoto}>
                      {getInitials(activeStudent.name)}
                    </div>
                  )}
                </div>
                <label style={styles.uploadPicLabel} className="interactive-element">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.3rem" }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                  </svg>
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePicChange}
                    style={{ display: "none" }}
                    disabled={editLoading}
                  />
                </label>
              </div>

              <Input
                label="Scholar Number"
                type="text"
                required
                value={editScholarNum}
                onChange={(e) => setEditScholarNum(e.target.value)}
                disabled={editLoading}
              />

              <Input
                label="Student Full Name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editLoading}
              />

              <Input
                label="Email Address"
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={editLoading}
              />

              <Input
                label="Contact Phone"
                type="text"
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                disabled={editLoading}
              />

              <Button type="submit" variant="primary" loading={editLoading} style={{ marginTop: "1rem" }}>
                Save Profile Changes
              </Button>
            </form>
          </div>

          {/* Right Column: Assessment Reports */}
          <div style={styles.profileCol} className="card">
            <h3 style={styles.sectionTitle}>Assessment Reports</h3>
            {resultsLoading ? (
              <div style={styles.centerLoading}>
                <div className="spinner" style={{ marginBottom: "0.5rem" }} />
                Loading results history...
              </div>
            ) : studentResults.length === 0 ? (
              <div style={styles.emptyResultsBox}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "0.8rem" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <h4>No Assessment Attempted</h4>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem", textAlign: "center" }}>
                  No completed quizzes or AI interviews found for email: **{activeStudent.email}**.
                </p>
              </div>
            ) : (
              <div style={styles.reportsWrapper}>
                {studentResults.map((res) => (
                  <div key={res.id} style={styles.reportItem}>
                    <div style={styles.reportMain}>
                      <div>
                        <h4 style={styles.reportTitle}>{res.assessmentTitle}</h4>
                        <p style={styles.reportMeta}>Duration: {res.duration} • Accuracy: {res.accuracy}%</p>
                      </div>
                      <div style={styles.gradeBadge}>
                        Grade {res.grade}
                      </div>
                    </div>
                    {res.feedback && (
                      <div style={styles.feedbackContainer}>
                        <strong>AI Feedback: </strong>{res.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RENDER VIEW 2: Student List View
  if (classIdParam) {
    return (
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.navigationRow}>
          <Button onClick={() => router.push("/students")} variant="secondary" size="sm">
            ← Back to Classes
          </Button>
          {selectedClass && (
            <h2 style={styles.classTitle}>
              Roster: <span style={styles.classHighlight}>{selectedClass.name}</span>
            </h2>
          )}
        </div>

        <div style={styles.actionsBar}>
          <div style={styles.searchContainer}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search students by name, email, or scholar number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.searchInput}
            />
          </div>
          <Button onClick={() => openUploadModal(classIdParam)} variant="primary">
            Import Excel List
          </Button>
        </div>

        {studentsLoading ? (
          <div style={styles.centerLoading}>
            <div className="spinner" style={{ marginBottom: "1rem" }} />
            Loading class students roster...
          </div>
        ) : errorMsg ? (
          <div style={styles.errorBanner}>{errorMsg}</div>
        ) : filteredStudents.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm ? "No students match your search filter." : "This class roster is empty. Import an Excel file to add students."}
          </div>
        ) : (
          <div style={styles.rosterCard} className="card">
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.th}>Photo</th>
                  <th style={styles.th}>Scholar No</th>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Phone Contact</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Inspect Profile</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/students?studentId=${student.id}&classId=${classIdParam}`)}
                    style={styles.clickableRow}
                    className="clickable-row-hover"
                  >
                    <td style={styles.td}>
                      {student.pictureUrl ? (
                        <img src={student.pictureUrl} alt={student.name} style={styles.profileThumbnail} />
                      ) : (
                        <div style={styles.fallbackThumbnail}>
                          {getInitials(student.name)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{student.scholarNumber}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{student.name}</td>
                    <td style={styles.td}>{student.email}</td>
                    <td style={styles.td}>{student.contactNumber || "-"}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <span style={styles.arrowIcon}>→</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={styles.paginationRow}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...styles.paginationBtn,
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer"
                  }}
                >
                  Prev
                </button>
                <div style={styles.pagesList}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      style={{
                        ...styles.pageNoBtn,
                        backgroundColor: currentPage === p ? "var(--primary)" : "transparent",
                        color: currentPage === p ? "#ffffff" : "var(--text-primary)",
                        fontWeight: currentPage === p ? 700 : 500
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...styles.paginationBtn,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Roster Upload Modal */}
        <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Import Class Students Roster">
          <form onSubmit={handleUploadSubmit} style={styles.modalForm}>
            {uploadError && <div style={styles.modalError}>{uploadError}</div>}
            {uploadSuccess && <div style={styles.modalSuccess}>{uploadSuccess}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Excel / CSV File</label>
              <div style={styles.fileDropZone}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.xlsm"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={styles.fileInput}
                  required
                  disabled={uploadLoading}
                />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "0.5rem" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
                </svg>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {uploadFile ? uploadFile.name : "Select excel roster sheet"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Supports XLSX, XLS, CSV format
                </span>
              </div>
            </div>

            <div style={styles.infoBox}>
              <h5 style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>File Columns Format Hint</h5>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                The sheet should contain columns for: **Scholar Number** (Roll No/Admission ID), **Student Name**, **Email**, and **Contact Number**. Column names are automatically mapped. Inline pictures are extracted automatically from `.xlsx` files.
              </p>
            </div>

            <div style={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setUploadModalOpen(false)} disabled={uploadLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={uploadLoading}>
                Import File
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // RENDER VIEW 1: Classes Grid View (Default)
  return (
    <div style={styles.container} className="animate-fade-in">
      <PageHeader
        title="Students"
        description="Select a class below to manage roster files, edit student profiles, and view completed quiz reports."
        action={
          <Button onClick={() => openUploadModal()} variant="primary">
            + Import Excel Roster
          </Button>
        }
      />

      {errorMsg && (
        <div style={styles.errorBanner}>
          {errorMsg}
        </div>
      )}

      <div>
        <h3 style={styles.subHeading}>Classes Overview</h3>
        {classesLoading ? (
          <div style={styles.centerLoading}>
            <div className="spinner" style={{ marginBottom: "0.5rem" }} />
            Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div style={styles.emptyState}>No classes found. Add classes in the Classes section first.</div>
        ) : (
          <div style={styles.classesGrid}>
            {classes.map((cls) => {
              return (
                <div
                  key={cls.id}
                  onClick={() => router.push(`/students?classId=${cls.id}`)}
                  style={styles.classCard}
                  className="interactive-element"
                >
                  <div style={styles.classInfo}>
                    <h4 style={styles.className}>{cls.name}</h4>
                    <p style={styles.classSubText}>Grade {cls.grade} • Sec {cls.section}</p>
                    <div style={styles.studentBadge}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "0.3rem" }}>
                        <path d="M17 21v-2a4 4 0 0 0-3-3.87" /><path d="M9 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /><circle cx="17" cy="11" r="3" />
                      </svg>
                      {cls.studentsCount ?? 0} Students
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openUploadModal(String(cls.id));
                    }}
                    style={styles.quickUploadBtn}
                    title="Upload student list"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Roster Upload Modal (Class not pre-selected) */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Import Class Students Roster">
        <form onSubmit={handleUploadSubmit} style={styles.modalForm}>
          {uploadError && <div style={styles.modalError}>{uploadError}</div>}
          {uploadSuccess && <div style={styles.modalSuccess}>{uploadSuccess}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Class</label>
            <select
              value={uploadClassId}
              onChange={(e) => setUploadClassId(e.target.value)}
              style={styles.select}
              required
              disabled={uploadLoading}
            >
              <option value="">-- Choose Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Grade {c.grade} - {c.section})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Excel / CSV File</label>
            <div style={styles.fileDropZone}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.xlsm"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                style={styles.fileInput}
                required
                disabled={uploadLoading}
              />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "0.5rem" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
              </svg>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                {uploadFile ? uploadFile.name : "Select excel roster sheet"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Supports XLSX, XLS, CSV format
              </span>
            </div>
          </div>

          <div style={styles.infoBox}>
            <h5 style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>File Columns Format Hint</h5>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              The sheet should contain columns for: **Scholar Number** (Roll No/Admission ID), **Student Name**, **Email**, and **Contact Number**. Column names are automatically mapped. Inline pictures are extracted automatically from `.xlsx` files.
            </p>
          </div>

          <div style={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={() => setUploadModalOpen(false)} disabled={uploadLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={uploadLoading}>
              Import File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Suspense-wrapped boundary entry point
export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <div className="spinner" style={{ marginBottom: "1rem" }} />
        Loading student dashboard...
      </div>
    }>
      <StudentsWorkspace />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  subHeading: {
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: "0.8rem",
    color: "var(--text-primary)",
    fontFamily: "var(--font-heading)",
  },
  navigationRow: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  classTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    fontFamily: "var(--font-heading)",
    color: "var(--text-primary)",
  },
  classHighlight: {
    color: "var(--primary)",
    borderBottom: "2.5px solid var(--secondary)",
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
  centerLoading: {
    padding: "4rem",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: "3rem",
    textAlign: "center",
    color: "var(--text-muted)",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface)",
  },
  classesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "1.2rem",
  },
  classCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.2rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    boxShadow: "var(--shadow-sm)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  classInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  className: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    fontFamily: "var(--font-heading)",
  },
  classSubText: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  studentBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    backgroundColor: "var(--primary-light)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    marginTop: "0.4rem",
    width: "fit-content",
  },
  quickUploadBtn: {
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
  },
  actionsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  searchContainer: {
    position: "relative",
    flexGrow: 1,
    maxWidth: "500px",
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
  },
  searchInput: {
    width: "100%",
    padding: "0.7rem 1rem 0.7rem 2.8rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
    fontSize: "0.95rem",
    outline: "none",
  },
  rosterCard: {
    padding: 0,
    overflow: "hidden",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface)",
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
  clickableRow: {
    borderBottom: "1px solid var(--border-color)",
    cursor: "pointer",
    transition: "background-color 0.25s",
  },
  td: {
    padding: "0.8rem 1.5rem",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  arrowIcon: {
    fontSize: "1.2rem",
    color: "var(--text-muted)",
    fontWeight: 700,
  },
  profileThumbnail: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1.5px solid var(--border-color)",
  },
  fallbackThumbnail: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--secondary-light)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: 700,
    border: "1.5px solid var(--border-color)",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    backgroundColor: "var(--bg-surface-hover)",
    borderTop: "1px solid var(--border-color)",
  },
  paginationBtn: {
    padding: "0.4rem 0.8rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--bg-surface)",
  },
  pagesList: {
    display: "flex",
    gap: "0.3rem",
  },
  pageNoBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  profileHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.8fr",
    gap: "1.5rem",
    alignItems: "start",
  },
  profileCol: {
    padding: "2rem",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginBottom: "1.5rem",
    fontFamily: "var(--font-heading)",
    color: "var(--text-primary)",
    borderBottom: "1.5px solid var(--border-color)",
    paddingBottom: "0.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  photoContainerWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "1rem",
  },
  photoContainer: {
    width: "110px",
    height: "110px",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    border: "2px solid var(--border-color)",
    backgroundColor: "var(--bg-surface-hover)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profileLargePhoto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fallbackLargePhoto: {
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "var(--primary)",
    backgroundColor: "var(--secondary-light)",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadPicLabel: {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
    padding: "0.35rem 0.75rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  emptyResultsBox: {
    padding: "4rem 2rem",
    textAlign: "center",
    border: "1px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-surface-hover)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  reportsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  reportItem: {
    padding: "1.2rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-surface-hover)",
  },
  reportMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
  },
  reportTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  reportMeta: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    marginTop: "0.15rem",
  },
  gradeBadge: {
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    padding: "0.2rem 0.5rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  feedbackContainer: {
    marginTop: "0.6rem",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    borderTop: "1px dashed var(--border-color)",
    paddingTop: "0.6rem",
    lineHeight: 1.4,
  },
  errorText: {
    color: "var(--error)",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  successText: {
    color: "var(--success)",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  modalForm: {
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
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  },
  fileDropZone: {
    position: "relative",
    border: "2px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "2rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    backgroundColor: "var(--bg-surface-hover)",
    transition: "border-color 0.2s",
  },
  fileInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  infoBox: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--secondary-light)",
    borderRadius: "var(--radius-sm)",
    borderLeft: "3.5px solid var(--primary)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.8rem",
    marginTop: "1rem",
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
  modalSuccess: {
    padding: "0.8rem 1rem",
    backgroundColor: "var(--success-light)",
    color: "var(--success)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.85rem",
    fontWeight: 500,
    border: "1px solid rgba(74, 130, 49, 0.2)",
  }
};
