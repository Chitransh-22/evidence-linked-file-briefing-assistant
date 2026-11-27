import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent, act } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "../app/providers";
import { router } from "../app/router";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../services/api/client";
import {
  ACTIONS,
  MENU_IDS,
  ROLES,
  canAccessMenu,
  canPerformAction,
  getAuthorizedMenuSections,
  hasPermission,
} from "../config/rbac";

function setAuthUser(role, username = "test_user") {
  const user = role
    ? { username, role, full_name: `Officer ${role}` }
    : null;
  useAuthStore.setState({
    user,
    token: role ? "test-jwt-token" : null,
    isAuthenticated: Boolean(role),
  });
}

async function renderAt(path) {
  await router.navigate(path);
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

describe("Centralized RBAC Matrix & Default-Deny", () => {
  it("denies all permissions for unknown, null, or undefined roles", () => {
    for (const badRole of [null, undefined, "", "unknown_role", "superadmin"]) {
      expect(getAuthorizedMenuSections(badRole)).toEqual([]);
      expect(canAccessMenu(badRole, MENU_IDS.DASHBOARD)).toBe(false);
      expect(canPerformAction(badRole, ACTIONS.CREATE_CASE)).toBe(false);
      expect(hasPermission(badRole, ACTIONS.VIEW_AUDIT_LOGS)).toBe(false);
    }
    expect(hasPermission(ROLES.SYSTEM_ADMINISTRATOR, "nonexistent:perm")).toBe(false);
  });

  it("matches Section 4 action permissions matrix for all 5 roles", () => {
    expect(canPerformAction(ROLES.INVESTIGATING_OFFICER, ACTIONS.CREATE_CASE)).toBe(true);
    expect(canPerformAction(ROLES.INVESTIGATING_OFFICER, ACTIONS.ASSIGN_OFFICERS)).toBe(false);
    expect(canPerformAction(ROLES.INVESTIGATING_OFFICER, ACTIONS.APPROVE_BRIEFING)).toBe(false);
    expect(canPerformAction(ROLES.INVESTIGATING_OFFICER, ACTIONS.VIEW_AUDIT_LOGS)).toBe(false);

    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.CREATE_CASE)).toBe(false);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.UPLOAD_DOCUMENT)).toBe(false);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.ASSIGN_OFFICERS)).toBe(true);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.ARCHIVE_CASE)).toBe(true);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.APPROVE_BRIEFING)).toBe(true);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.REGENERATE_BRIEFING_SECTION)).toBe(false);

    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.CREATE_CASE)).toBe(true);
    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.UPLOAD_DOCUMENT)).toBe(true);
    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.VERIFY_EVIDENCE)).toBe(false);
    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.REVIEW_CONTRADICTION)).toBe(false);
    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.EXPORT_BRIEFING)).toBe(false);

    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.CREATE_CASE)).toBe(false);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.VERIFY_EVIDENCE)).toBe(false);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.EXPORT_BRIEFING)).toBe(true);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.VIEW_AUDIT_LOGS)).toBe(true);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.VERIFY_AUDIT_CHAIN)).toBe(true);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.EXPORT_AUDIT_CSV)).toBe(true);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.MANAGE_USERS)).toBe(false);

    expect(canPerformAction(ROLES.SYSTEM_ADMINISTRATOR, ACTIONS.MANAGE_USERS)).toBe(true);
    expect(canPerformAction(ROLES.SYSTEM_ADMINISTRATOR, ACTIONS.APPROVE_BRIEFING)).toBe(true);
    expect(canPerformAction(ROLES.SYSTEM_ADMINISTRATOR, ACTIONS.VIEW_SYSTEM_DIAGNOSTICS)).toBe(true);
    expect(canPerformAction(ROLES.SYSTEM_ADMINISTRATOR, ACTIONS.DELETE_CASE)).toBe(true);
    expect(canPerformAction(ROLES.SYSTEM_ADMINISTRATOR, ACTIONS.DELETE_DOCUMENT)).toBe(true);
    expect(canPerformAction(ROLES.INVESTIGATING_OFFICER, ACTIONS.DELETE_CASE)).toBe(false);
    expect(canPerformAction(ROLES.INVESTIGATING_OFFICER, ACTIONS.DELETE_DOCUMENT)).toBe(false);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.DELETE_CASE)).toBe(false);
    expect(canPerformAction(ROLES.SUPERVISORY_REVIEWER, ACTIONS.DELETE_DOCUMENT)).toBe(false);
    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.DELETE_CASE)).toBe(false);
    expect(canPerformAction(ROLES.INTAKE_OFFICER, ACTIONS.DELETE_DOCUMENT)).toBe(false);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.DELETE_CASE)).toBe(false);
    expect(canPerformAction(ROLES.AUDITOR, ACTIONS.DELETE_DOCUMENT)).toBe(false);
  });
});

describe("Dynamic Role-Based Sidebar & Route Guards", () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthUser(null);
    vi.spyOn(apiClient, "get").mockImplementation((url) => {
      if (url.startsWith("/cases/case-1")) {
        return Promise.resolve({
          data: {
            case: { id: "case-1", case_reference: "CR-2026-01", title: "Sample Case", status: "Active", priority: "High", category: "Audit", assigned_officers: ["investigator"] },
            statistics: { documents: 1, evidence_records: 1, events: 1, contradictions: 0, latest_briefing_status: "Draft" },
          },
        });
      }
      if (url.startsWith("/briefings/brf-1")) {
        return Promise.resolve({
          data: {
            briefing: {
              _id: "brf-1",
              title: "Briefing 1",
              version: 1,
              status: "Draft",
              case_reference: "CR-2026-01",
              created_by: "investigator",
              section_data: { "Executive Summary": "Initial summary text" },
              change_history: [],
            },
            claims: [],
          },
        });
      }
      if (url.startsWith("/briefings")) {
        return Promise.resolve({
          data: {
            total: 1,
            items: [
              { _id: "brf-1", title: "Briefing 1", case_reference: "CR-2026-01", version: 1, created_by: "investigator", status: "Under Review", claim_stats: { supported: 1, total: 1 } },
            ],
          },
        });
      }
      if (url.startsWith("/documents")) {
        return Promise.resolve({
          data: {
            total: 1,
            pages: 1,
            items: [
              { _id: "doc-1", id: "doc-1", document_title: "Failed Exhibit", original_filename: "exhibit.pdf", language: "eng", classification: "scanned", page_count: 2, processing_status: "Failed" },
            ],
          },
        });
      }
      if (url.startsWith("/evidence")) {
        return Promise.resolve({
          data: {
            total: 1,
            pages: 1,
            items: [
              { _id: "ev-1", document_id: "doc-1", page_number: 1, evidence_category: "Factual Finding", source_excerpt: "Recorded transfer", confidence: 0.9, verification_status: "unverified" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { total: 0, pages: 1, items: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Investigating Officer: hides Governance & Administration and Tamper-Evident Audit", async () => {
    setAuthUser(ROLES.INVESTIGATING_OFFICER, "investigator");
    await renderAt("/dashboard");

    const nav = screen.getByRole("navigation", { name: /Main Navigation/i });
    expect(within(nav).getByText("Dashboard")).toBeInTheDocument();
    expect(within(nav).getByText("Document Intake")).toBeInTheDocument();
    expect(within(nav).getByText("Investigation Briefings")).toBeInTheDocument();

    expect(within(nav).queryByText("Governance & Administration")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Tamper-Evident Audit")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Officer Accounts")).not.toBeInTheDocument();
  });

  it("Supervisory Reviewer: hides Document Intake and Governance & Administration", async () => {
    setAuthUser(ROLES.SUPERVISORY_REVIEWER, "reviewer");
    await renderAt("/dashboard");

    const nav = screen.getByRole("navigation", { name: /Main Navigation/i });
    expect(within(nav).getByText("Case Register")).toBeInTheDocument();
    expect(within(nav).getByText("Document Library")).toBeInTheDocument();
    expect(within(nav).getByText("Investigation Briefings")).toBeInTheDocument();

    expect(within(nav).queryByText("Document Intake")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Governance & Administration")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Tamper-Evident Audit")).not.toBeInTheDocument();
  });

  it("System Administrator: displays all sections and administrative links", async () => {
    setAuthUser(ROLES.SYSTEM_ADMINISTRATOR, "admin");
    await renderAt("/dashboard");

    const nav = screen.getByRole("navigation", { name: /Main Navigation/i });
    expect(within(nav).getByText("Core Operations")).toBeInTheDocument();
    expect(within(nav).getByText("Intelligence & Evidence")).toBeInTheDocument();
    expect(within(nav).getByText("Governance & Administration")).toBeInTheDocument();
    expect(within(nav).getByText("Document Intake")).toBeInTheDocument();
    expect(within(nav).getByText("Investigation Briefings")).toBeInTheDocument();
    expect(within(nav).getByText("Officer Accounts")).toBeInTheDocument();
    expect(within(nav).getByText("AI Pipeline Readiness")).toBeInTheDocument();
    expect(within(nav).getByText("System Health")).toBeInTheDocument();
    expect(within(nav).getByText("Tamper-Evident Audit")).toBeInTheDocument();
  });

  it("Intake Officer: hides Investigation Briefings and Governance & Administration", async () => {
    setAuthUser(ROLES.INTAKE_OFFICER, "intake_officer");
    await renderAt("/dashboard");

    const nav = screen.getByRole("navigation", { name: /Main Navigation/i });
    expect(within(nav).getByText("Document Intake")).toBeInTheDocument();
    expect(within(nav).getByText("Evidence Ledger")).toBeInTheDocument();
    expect(within(nav).getByText("Contradiction Analysis")).toBeInTheDocument();

    expect(within(nav).queryByText("Investigation Briefings")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Governance & Administration")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Tamper-Evident Audit")).not.toBeInTheDocument();
  });

  it("Independent Auditor: shows Tamper-Evident Audit and Briefings, hides Document Intake & /admin/*", async () => {
    setAuthUser(ROLES.AUDITOR, "auditor");
    await renderAt("/dashboard");

    const nav = screen.getByRole("navigation", { name: /Main Navigation/i });
    expect(within(nav).getByText("Investigation Briefings")).toBeInTheDocument();
    expect(within(nav).getByText("Governance & Administration")).toBeInTheDocument();
    expect(within(nav).getByText("Tamper-Evident Audit")).toBeInTheDocument();

    expect(within(nav).queryByText("Document Intake")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Officer Accounts")).not.toBeInTheDocument();
    expect(within(nav).queryByText("AI Pipeline Readiness")).not.toBeInTheDocument();
    expect(within(nav).queryByText("System Health")).not.toBeInTheDocument();
  });

  it("blocks direct URL access to unauthorized routes with 403 Forbidden", async () => {
    setAuthUser(ROLES.INVESTIGATING_OFFICER, "investigator");
    const v1 = await renderAt("/audit-logs");
    expect(screen.getByText(/403 - Forbidden Access/i)).toBeInTheDocument();
    v1.unmount();

    setAuthUser(ROLES.SUPERVISORY_REVIEWER, "reviewer");
    const v2 = await renderAt("/intake");
    expect(screen.getByText(/403 - Forbidden Access/i)).toBeInTheDocument();
    v2.unmount();

    setAuthUser(ROLES.INTAKE_OFFICER, "intake_officer");
    const v3 = await renderAt("/briefings");
    expect(screen.getByText(/403 - Forbidden Access/i)).toBeInTheDocument();
    v3.unmount();

    setAuthUser(ROLES.AUDITOR, "auditor");
    const v4 = await renderAt("/admin/users");
    expect(screen.getByText(/403 - Forbidden Access/i)).toBeInTheDocument();
    v4.unmount();
  });

  it("hides unauthorized page-level action buttons across operational pages", async () => {
    // Supervisory Reviewer on Dashboard & Document Library & Chronology
    setAuthUser(ROLES.SUPERVISORY_REVIEWER, "reviewer");
    const v1 = await renderAt("/dashboard");
    expect(screen.queryByRole("button", { name: /Create Case/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Upload Documents/i })).not.toBeInTheDocument();
    v1.unmount();

    const v2 = await renderAt("/documents");
    await waitFor(() => {
      expect(screen.getByText("Failed Exhibit")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Intake New Document/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Retry Processing Pipeline/i)).not.toBeInTheDocument();
    v2.unmount();

    const v3 = await renderAt("/chronology");
    expect(screen.queryByRole("button", { name: /Add Event Manually/i })).not.toBeInTheDocument();
    v3.unmount();

    // Auditor on Briefings Register & Officer Review
    setAuthUser(ROLES.AUDITOR, "auditor");
    const v4 = await renderAt("/briefings");
    await waitFor(() => {
      expect(screen.getByText("Briefing 1")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /PDF/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /DOCX/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
    v4.unmount();

    const v5 = await renderAt("/briefings/brf-1/review");
    await waitFor(() => {
      expect(screen.getByDisplayValue("Initial summary text")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Initial summary text")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: /Save Draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Regenerate Section/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit for Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Claim Verification Workspace/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export PDF/i })).toBeInTheDocument();
    v5.unmount();

    // Intake Officer on Evidence Ledger: inspection works, verification form is hidden
    setAuthUser(ROLES.INTAKE_OFFICER, "intake_officer");
    const v6 = await renderAt("/evidence");
    await waitFor(() => {
      expect(screen.getByText("ev-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Inspect/i }));
    expect(screen.getByText(/Original Grounded Source Excerpt:/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save Verification/i })).not.toBeInTheDocument();
    v6.unmount();

    // Role switch from Admin -> Investigator immediately drops Admin menu items
    setAuthUser(ROLES.SYSTEM_ADMINISTRATOR, "admin");
    const v7 = await renderAt("/dashboard");
    expect(within(screen.getByRole("navigation", { name: /Main Navigation/i })).getByText("Officer Accounts")).toBeInTheDocument();
    act(() => {
      setAuthUser(ROLES.INVESTIGATING_OFFICER, "investigator");
    });
    await waitFor(() => {
      const navAfter = screen.getByRole("navigation", { name: /Main Navigation/i });
      expect(within(navAfter).queryByText("Officer Accounts")).not.toBeInTheDocument();
      expect(within(navAfter).queryByText("Tamper-Evident Audit")).not.toBeInTheDocument();
    });
    expect(v7.container.querySelector(".app-shell.auth-theme")).toBeTruthy();
    v7.unmount();

    // Sign-in page must remain outside .auth-theme
    setAuthUser(null);
    const vLogin = await renderAt("/login");
    expect(vLogin.container.querySelector(".auth-theme")).toBeNull();
    vLogin.unmount();
  });
});
