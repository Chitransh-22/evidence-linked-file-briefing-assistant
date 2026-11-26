import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LandingPage } from "../features/landing/LandingPage";
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
import { ROUTE_KEYS, VALID_ROLES, canAccessRoute } from "../config/rbac";

function ProtectedRoute({ children, routeKey, requiredRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role;
  const isKnownRole = Boolean(role && VALID_ROLES.has(role));

  if (!isKnownRole) {
    return (
      <div style={{ padding: "40px", color: "#B91C1C", textAlign: "center" }}>
        <h2>403 - Forbidden Access</h2>
        <p style={{ marginTop: "8px", color: "var(--color-text-secondary, #666666)" }}>
          Your security role (<code>{role || "unassigned"}</code>) is not authorized to access this facility.
        </p>
      </div>
    );
  }

  if (routeKey && !canAccessRoute(role, routeKey)) {
    return (
      <div style={{ padding: "40px", color: "#B91C1C", textAlign: "center" }}>
        <h2>403 - Forbidden Access</h2>
        <p style={{ marginTop: "8px", color: "var(--color-text-secondary, #666666)" }}>
          Your security role (<code>{role}</code>) is not authorized to access this administrative facility.
        </p>
      </div>
    );
  }

  if (requiredRoles && !requiredRoles.includes(role)) {
    return (
      <div style={{ padding: "40px", color: "#B91C1C", textAlign: "center" }}>
        <h2>403 - Forbidden Access</h2>
        <p style={{ marginTop: "8px", color: "var(--color-text-secondary, #666666)" }}>
          Your security role (<code>{role}</code>) is not authorized to access this administrative facility.
        </p>
      </div>
    );
  }

  return children;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.DASHBOARD}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "cases",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.CASES}>
            <CaseRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "cases/:caseId",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.CASES}>
            <CaseDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "intake",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.INTAKE}>
            <DocumentIntakePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "documents",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.DOCUMENTS}>
            <DocumentLibraryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "documents/:documentId",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.DOCUMENTS}>
            <DocumentViewerPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "processing",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.PROCESSING}>
            <ProcessingQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "evidence",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.EVIDENCE}>
            <EvidenceLedgerPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "evidence/search",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.EVIDENCE_SEARCH}>
            <EvidenceSearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "entities",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.ENTITIES}>
            <EntityRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "chronology",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.CHRONOLOGY}>
            <ChronologyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "contradictions",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.CONTRADICTIONS}>
            <ContradictionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "briefings",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.BRIEFINGS_LIST_OR_VIEW}>
            <BriefingsRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "briefings/generate/:caseId",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.BRIEFINGS_GENERATE}>
            <BriefingGeneratePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "briefings/:briefingId/verification",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.BRIEFINGS_VERIFY}>
            <ClaimVerificationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "briefings/:briefingId/review",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.BRIEFINGS_LIST_OR_VIEW}>
            <OfficerReviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "audit-logs",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.AUDIT_LOGS}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/users",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.ADMIN_USERS}>
            <UserManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/ai-services",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.ADMIN_AI_SERVICES}>
            <AIServicesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/system",
        element: (
          <ProtectedRoute routeKey={ROUTE_KEYS.ADMIN_SYSTEM}>
            <SystemHealthPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
