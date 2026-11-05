import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { CaseRegisterPage } from "../features/cases/CaseRegisterPage";
import { CaseDetailPage } from "../features/cases/CaseDetailPage";
import { DocumentIntakePage } from "../features/intake/DocumentIntakePage";
import { DocumentLibraryPage } from "../features/documents/DocumentLibraryPage";
import { ProcessingQueuePage } from "../features/processing/ProcessingQueuePage";
import { DocumentViewerPage } from "../features/documents/DocumentViewerPage";
import { EvidenceLedgerPage } from "../features/evidence/EvidenceLedgerPage";
import { EvidenceSearchPage } from "../features/search/EvidenceSearchPage";
import { EntityRegisterPage } from "../features/entities/EntityRegisterPage";
import { ChronologyPage } from "../features/chronology/ChronologyPage";
import { ContradictionsPage } from "../features/contradictions/ContradictionsPage";
import { BriefingGeneratePage } from "../features/briefings/BriefingGeneratePage";
import { ClaimVerificationPage } from "../features/verification/ClaimVerificationPage";
import { OfficerReviewPage } from "../features/review/OfficerReviewPage";
import { BriefingsRegisterPage } from "../features/briefings/BriefingsRegisterPage";
import { AuditLogsPage } from "../features/audit/AuditLogsPage";
import { UserManagementPage } from "../features/administration/UserManagementPage";
import { AIServicesPage } from "../features/administration/AIServicesPage";
import { SystemHealthPage } from "../features/administration/SystemHealthPage";
import { useAuthStore } from "../store/authStore";

function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRoles && user && user.role !== "system_administrator" && !requiredRoles.includes(user.role)) {
    return (
      <div style={{ padding: "40px", color: "#B91C1C", textAlign: "center" }}>
        <h2>403 - Forbidden Access</h2>
        <p style={{ marginTop: "8px", color: "#64748B" }}>
          Your security role (<code>{user.role}</code>) is not authorized to access this administrative facility.
        </p>
      </div>
    );
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "cases", element: <CaseRegisterPage /> },
      { path: "cases/:caseId", element: <CaseDetailPage /> },
      { path: "intake", element: <DocumentIntakePage /> },
      { path: "documents", element: <DocumentLibraryPage /> },
      { path: "documents/:documentId", element: <DocumentViewerPage /> },
      { path: "processing", element: <ProcessingQueuePage /> },
      { path: "evidence", element: <EvidenceLedgerPage /> },
      { path: "evidence/search", element: <EvidenceSearchPage /> },
      { path: "entities", element: <EntityRegisterPage /> },
      { path: "chronology", element: <ChronologyPage /> },
      { path: "contradictions", element: <ContradictionsPage /> },
      { path: "briefings", element: <BriefingsRegisterPage /> },
      { path: "briefings/generate/:caseId", element: <BriefingGeneratePage /> },
      { path: "briefings/:briefingId/verification", element: <ClaimVerificationPage /> },
      { path: "briefings/:briefingId/review", element: <OfficerReviewPage /> },
      {
        path: "audit-logs",
        element: (
          <ProtectedRoute requiredRoles={["auditor", "system_administrator"]}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/users",
        element: (
          <ProtectedRoute requiredRoles={["system_administrator"]}>
            <UserManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/ai-services",
        element: (
          <ProtectedRoute requiredRoles={["system_administrator"]}>
            <AIServicesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/system",
        element: (
          <ProtectedRoute requiredRoles={["system_administrator"]}>
            <SystemHealthPage />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
