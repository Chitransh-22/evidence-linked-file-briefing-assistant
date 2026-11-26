/**
 * Centralized Role-Based Access Control (RBAC) Configuration
 * Single source of truth for sidebar menu visibility, route guards,
 * and page-level action permissions.
 *
 * Implements default-deny behavior for unknown roles and undocumented permissions.
 */

export const ROLES = Object.freeze({
  SYSTEM_ADMINISTRATOR: "system_administrator",
  INVESTIGATING_OFFICER: "investigating_officer",
  SUPERVISORY_REVIEWER: "supervisory_reviewer",
  INTAKE_OFFICER: "intake_officer",
  AUDITOR: "auditor",
});

export const VALID_ROLES = new Set(Object.values(ROLES));

export const ROLE_BADGE_LABELS = Object.freeze({
  [ROLES.SYSTEM_ADMINISTRATOR]: "Admin",
  [ROLES.INVESTIGATING_OFFICER]: "Investigator",
  [ROLES.SUPERVISORY_REVIEWER]: "Reviewer",
  [ROLES.INTAKE_OFFICER]: "Intake",
  [ROLES.AUDITOR]: "Auditor",
});

export const MENU_IDS = Object.freeze({
  DASHBOARD: "menu:dashboard",
  CASES: "menu:cases",
  DOCUMENT_INTAKE: "menu:intake",
  DOCUMENT_LIBRARY: "menu:documents",
  PROCESSING_QUEUE: "menu:processing",
  EVIDENCE_LEDGER: "menu:evidence",
  EVIDENCE_SEARCH: "menu:evidence_search",
  ENTITY_REGISTER: "menu:entities",
  EVENT_CHRONOLOGY: "menu:chronology",
  CONTRADICTION_ANALYSIS: "menu:contradictions",
  INVESTIGATION_BRIEFINGS: "menu:briefings",
  OFFICER_ACCOUNTS: "menu:admin_users",
  AI_PIPELINE_READINESS: "menu:admin_ai_services",
  SYSTEM_HEALTH: "menu:admin_system",
  TAMPER_EVIDENT_AUDIT: "menu:audit_logs",
});

export const ACTIONS = Object.freeze({
  CREATE_CASE: "action:case:create",
  UPDATE_CASE: "action:case:update",
  ASSIGN_OFFICERS: "action:case:assign",
  ARCHIVE_CASE: "action:case:archive",
  UPLOAD_DOCUMENT: "action:document:upload",
  RETRY_PROCESSING: "action:processing:retry",
  CANCEL_PROCESSING: "action:processing:cancel",
  EDIT_EVIDENCE: "action:evidence:edit",
  VERIFY_EVIDENCE: "action:evidence:verify",
  MUTATE_CHRONOLOGY: "action:chronology:mutate",
  REVIEW_CONTRADICTION: "action:contradiction:review",
  VIEW_BRIEFINGS: "action:briefing:view",
  GENERATE_BRIEFING: "action:briefing:generate",
  EDIT_BRIEFING: "action:briefing:edit",
  REGENERATE_BRIEFING_SECTION: "action:briefing:regenerate_section",
  VERIFY_CLAIMS: "action:briefing:verify_claims",
  SUBMIT_BRIEFING_REVIEW: "action:briefing:submit_review",
  APPROVE_BRIEFING: "action:briefing:approve",
  RETURN_BRIEFING: "action:briefing:return",
  EXPORT_BRIEFING: "action:briefing:export",
  VIEW_AUDIT_LOGS: "action:audit:view",
  VERIFY_AUDIT_CHAIN: "action:audit:verify_chain",
  EXPORT_AUDIT_CSV: "action:audit:export_csv",
  MANAGE_USERS: "action:admin:users",
  VIEW_AI_PIPELINE_READINESS: "action:admin:ai_services",
  VIEW_SYSTEM_DIAGNOSTICS: "action:admin:system",
});

export const ROUTE_KEYS = Object.freeze({
  DASHBOARD: "route:dashboard",
  CASES: "route:cases",
  INTAKE: "route:intake",
  DOCUMENTS: "route:documents",
  PROCESSING: "route:processing",
  EVIDENCE: "route:evidence",
  EVIDENCE_SEARCH: "route:evidence_search",
  ENTITIES: "route:entities",
  CHRONOLOGY: "route:chronology",
  CONTRADICTIONS: "route:contradictions",
  BRIEFINGS_LIST_OR_VIEW: "route:briefings",
  BRIEFINGS_GENERATE: "route:briefings_generate",
  BRIEFINGS_VERIFY: "route:briefings_verify",
  AUDIT_LOGS: "route:audit_logs",
  ADMIN_USERS: "route:admin_users",
  ADMIN_AI_SERVICES: "route:admin_ai_services",
  ADMIN_SYSTEM: "route:admin_system",
});

const ALL_OPERATIONAL_ROLES = [
  ROLES.SYSTEM_ADMINISTRATOR,
  ROLES.INVESTIGATING_OFFICER,
  ROLES.SUPERVISORY_REVIEWER,
  ROLES.INTAKE_OFFICER,
  ROLES.AUDITOR,
];

export const MENU_PERMISSIONS = Object.freeze({
  [MENU_IDS.DASHBOARD]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.CASES]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.DOCUMENT_INTAKE]: [
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.INVESTIGATING_OFFICER,
    ROLES.INTAKE_OFFICER,
  ],
  [MENU_IDS.DOCUMENT_LIBRARY]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.PROCESSING_QUEUE]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.EVIDENCE_LEDGER]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.EVIDENCE_SEARCH]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.ENTITY_REGISTER]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.EVENT_CHRONOLOGY]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.CONTRADICTION_ANALYSIS]: ALL_OPERATIONAL_ROLES,
  [MENU_IDS.INVESTIGATION_BRIEFINGS]: [
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.AUDITOR,
  ],
  [MENU_IDS.OFFICER_ACCOUNTS]: [ROLES.SYSTEM_ADMINISTRATOR],
  [MENU_IDS.AI_PIPELINE_READINESS]: [ROLES.SYSTEM_ADMINISTRATOR],
  [MENU_IDS.SYSTEM_HEALTH]: [ROLES.SYSTEM_ADMINISTRATOR],
  [MENU_IDS.TAMPER_EVIDENT_AUDIT]: [
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.AUDITOR,
  ],
});

export const ACTION_PERMISSIONS = Object.freeze({
  [ACTIONS.CREATE_CASE]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.INTAKE_OFFICER,
  ],
  [ACTIONS.UPDATE_CASE]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.ASSIGN_OFFICERS]: [
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.ARCHIVE_CASE]: [
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.UPLOAD_DOCUMENT]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.INTAKE_OFFICER,
  ],
  [ACTIONS.RETRY_PROCESSING]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.CANCEL_PROCESSING]: [
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.EDIT_EVIDENCE]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.VERIFY_EVIDENCE]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.MUTATE_CHRONOLOGY]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.REVIEW_CONTRADICTION]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.VIEW_BRIEFINGS]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.AUDITOR,
  ],
  [ACTIONS.GENERATE_BRIEFING]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.EDIT_BRIEFING]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.REGENERATE_BRIEFING_SECTION]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.VERIFY_CLAIMS]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.SUBMIT_BRIEFING_REVIEW]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.APPROVE_BRIEFING]: [
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.RETURN_BRIEFING]: [
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
  ],
  [ACTIONS.EXPORT_BRIEFING]: [
    ROLES.INVESTIGATING_OFFICER,
    ROLES.SUPERVISORY_REVIEWER,
    ROLES.SYSTEM_ADMINISTRATOR,
    ROLES.AUDITOR,
  ],
  [ACTIONS.VIEW_AUDIT_LOGS]: [ROLES.SYSTEM_ADMINISTRATOR, ROLES.AUDITOR],
  [ACTIONS.VERIFY_AUDIT_CHAIN]: [ROLES.SYSTEM_ADMINISTRATOR, ROLES.AUDITOR],
  [ACTIONS.EXPORT_AUDIT_CSV]: [ROLES.SYSTEM_ADMINISTRATOR, ROLES.AUDITOR],
  [ACTIONS.MANAGE_USERS]: [ROLES.SYSTEM_ADMINISTRATOR],
  [ACTIONS.VIEW_AI_PIPELINE_READINESS]: [ROLES.SYSTEM_ADMINISTRATOR],
  [ACTIONS.VIEW_SYSTEM_DIAGNOSTICS]: [ROLES.SYSTEM_ADMINISTRATOR],
});

export const ROUTE_PERMISSIONS = Object.freeze({
  [ROUTE_KEYS.DASHBOARD]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.CASES]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.INTAKE]: MENU_PERMISSIONS[MENU_IDS.DOCUMENT_INTAKE],
  [ROUTE_KEYS.DOCUMENTS]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.PROCESSING]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.EVIDENCE]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.EVIDENCE_SEARCH]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.ENTITIES]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.CHRONOLOGY]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.CONTRADICTIONS]: ALL_OPERATIONAL_ROLES,
  [ROUTE_KEYS.BRIEFINGS_LIST_OR_VIEW]: MENU_PERMISSIONS[MENU_IDS.INVESTIGATION_BRIEFINGS],
  [ROUTE_KEYS.BRIEFINGS_GENERATE]: ACTION_PERMISSIONS[ACTIONS.GENERATE_BRIEFING],
  [ROUTE_KEYS.BRIEFINGS_VERIFY]: ACTION_PERMISSIONS[ACTIONS.VERIFY_CLAIMS],
  [ROUTE_KEYS.AUDIT_LOGS]: MENU_PERMISSIONS[MENU_IDS.TAMPER_EVIDENT_AUDIT],
  [ROUTE_KEYS.ADMIN_USERS]: MENU_PERMISSIONS[MENU_IDS.OFFICER_ACCOUNTS],
  [ROUTE_KEYS.ADMIN_AI_SERVICES]: MENU_PERMISSIONS[MENU_IDS.AI_PIPELINE_READINESS],
  [ROUTE_KEYS.ADMIN_SYSTEM]: MENU_PERMISSIONS[MENU_IDS.SYSTEM_HEALTH],
});

export const MENU_SECTIONS = Object.freeze([
  {
    id: "core_operations",
    title: "Core Operations",
    items: [
      { id: MENU_IDS.DASHBOARD, to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { id: MENU_IDS.CASES, to: "/cases", label: "Case Register", icon: "FolderKanban" },
      { id: MENU_IDS.DOCUMENT_INTAKE, to: "/intake", label: "Document Intake", icon: "UploadCloud" },
      { id: MENU_IDS.DOCUMENT_LIBRARY, to: "/documents", label: "Document Library", icon: "FileText" },
      { id: MENU_IDS.PROCESSING_QUEUE, to: "/processing", label: "Processing Queue", icon: "Cpu" },
    ],
  },
  {
    id: "intelligence_evidence",
    title: "Intelligence & Evidence",
    items: [
      { id: MENU_IDS.EVIDENCE_LEDGER, to: "/evidence", end: true, label: "Evidence Ledger", icon: "BookOpen" },
      { id: MENU_IDS.EVIDENCE_SEARCH, to: "/evidence/search", label: "Evidence Search", icon: "Search" },
      { id: MENU_IDS.ENTITY_REGISTER, to: "/entities", label: "Entity Register", icon: "Users" },
      { id: MENU_IDS.EVENT_CHRONOLOGY, to: "/chronology", label: "Event Chronology", icon: "Calendar" },
      { id: MENU_IDS.CONTRADICTION_ANALYSIS, to: "/contradictions", label: "Contradiction Analysis", icon: "AlertTriangle" },
      { id: MENU_IDS.INVESTIGATION_BRIEFINGS, to: "/briefings", end: true, label: "Investigation Briefings", icon: "FileSignature" },
    ],
  },
  {
    id: "governance_administration",
    title: "Governance & Administration",
    items: [
      { id: MENU_IDS.OFFICER_ACCOUNTS, to: "/admin/users", label: "Officer Accounts", icon: "UserCog" },
      { id: MENU_IDS.AI_PIPELINE_READINESS, to: "/admin/ai-services", label: "AI Pipeline Readiness", icon: "Sliders" },
      { id: MENU_IDS.SYSTEM_HEALTH, to: "/admin/system", label: "System Health", icon: "Activity" },
      { id: MENU_IDS.TAMPER_EVIDENT_AUDIT, to: "/audit-logs", label: "Tamper-Evident Audit", icon: "ShieldCheck" },
    ],
  },
]);

function isRoleAllowed(role, allowedRoles) {
  if (!role || !VALID_ROLES.has(role) || !Array.isArray(allowedRoles)) {
    return false;
  }
  return allowedRoles.includes(role);
}

export function canAccessMenu(role, menuId) {
  return isRoleAllowed(role, MENU_PERMISSIONS[menuId]);
}

export function canPerformAction(role, action) {
  return isRoleAllowed(role, ACTION_PERMISSIONS[action]);
}

export function canAccessRoute(role, routeKey) {
  return isRoleAllowed(role, ROUTE_PERMISSIONS[routeKey]);
}

export function hasPermission(role, permission) {
  if (!role || !VALID_ROLES.has(role) || !permission) {
    return false;
  }
  if (MENU_PERMISSIONS[permission]) {
    return isRoleAllowed(role, MENU_PERMISSIONS[permission]);
  }
  if (ACTION_PERMISSIONS[permission]) {
    return isRoleAllowed(role, ACTION_PERMISSIONS[permission]);
  }
  if (ROUTE_PERMISSIONS[permission]) {
    return isRoleAllowed(role, ROUTE_PERMISSIONS[permission]);
  }
  return false;
}

export function getAuthorizedMenuSections(role) {
  if (!role || !VALID_ROLES.has(role)) {
    return [];
  }
  return MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessMenu(role, item.id)),
  })).filter((section) => section.items.length > 0);
}

export function getRoleBadgeLabel(role) {
  return ROLE_BADGE_LABELS[role] || "Officer";
}
