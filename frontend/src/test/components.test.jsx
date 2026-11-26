import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { StatusBadge } from "../components/common/StatusBadge";
import { DataTable } from "../components/tables/DataTable";
import { LoginPage } from "../features/auth/LoginPage";

describe("Frontend Component Verification", () => {
  it("renders StatusBadge with correct variant styling", () => {
    const { container: c1 } = render(<StatusBadge status="Ready for Review" />);
    expect(screen.getByText("Ready for Review")).toBeInTheDocument();
    expect(c1.querySelector(".badge-success")).toBeTruthy();

    const { container: c2 } = render(<StatusBadge status="Failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(c2.querySelector(".badge-danger")).toBeTruthy();

    const { container: c3 } = render(<StatusBadge status="Processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(c3.querySelector(".badge-warning")).toBeTruthy();
  });

  it("renders DataTable with column headers, rows, and pagination", () => {
    const cols = [
      { header: "Reference", accessor: "ref" },
      { header: "Case Title", accessor: "title" },
      { header: "Status", accessor: "status", render: (r) => <StatusBadge status={r.status} /> }
    ];
    const data = [
      { id: "1", ref: "CR-01", title: "Land Valuation Inquiry", status: "Active" },
      { id: "2", ref: "CR-02", title: "Disbursement Audit", status: "Completed" }
    ];

    render(<DataTable columns={cols} data={data} />);

    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("Land Valuation Inquiry")).toBeInTheDocument();
    expect(screen.getByText("Disbursement Audit")).toBeInTheDocument();
  });

  it("renders DataTable loading and empty states properly", () => {
    const cols = [{ header: "Name", accessor: "name" }];
    const { rerender } = render(<DataTable columns={cols} data={[]} isLoading={true} />);
    expect(screen.getByText(/Loading government ledger records/i)).toBeInTheDocument();

    rerender(<DataTable columns={cols} data={[]} isLoading={false} emptyMessage="Zero records found" />);
    expect(screen.getByText("Zero records found")).toBeInTheDocument();
  });

  it("renders LoginPage as minimalist government access terminal with 5 role tiles", () => {
    const { container } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(container.querySelector(".login-terminal")).toBeTruthy();
    expect(container.querySelector(".lucide-shield-check")).toBeNull();
    expect(screen.getByText("LEKH")).toBeInTheDocument();
    expect(screen.getByText("Restricted Access")).toBeInTheDocument();
    expect(screen.getByText("OFFICIAL ACCESS PORTAL")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Ledger for Evidence and Knowledge Handling/i })
    ).toBeInTheDocument();
    expect(screen.getByText("01 / AUTHENTICATION")).toBeInTheDocument();
    expect(screen.getByText("02 / ROLE ACCESS")).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/e\.g\. investigator or admin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your confidential password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Authenticate & Access System/i })).toBeInTheDocument();

    // Verify all 5 quick-login role tiles are present without coloured role badges
    expect(screen.getByText("Investigating Officer")).toBeInTheDocument();
    expect(screen.getByText("Supervisory Reviewer")).toBeInTheDocument();
    expect(screen.getByText("System Administrator")).toBeInTheDocument();
    expect(screen.getByText("Intake Officer")).toBeInTheDocument();
    expect(screen.getByText("Independent Auditor")).toBeInTheDocument();
    expect(container.querySelector(".lt-role-tile.is-full")).toBeTruthy();

    // Bottom strip and institutional footer
    expect(screen.getByText("Evidence Integrity")).toBeInTheDocument();
    expect(screen.getByText("Role-Based Access")).toBeInTheDocument();
    expect(screen.getByText("Audit Accountability")).toBeInTheDocument();
    expect(screen.getByText("LEKH · AUTHORIZED PERSONNEL ONLY")).toBeInTheDocument();
  });
});
