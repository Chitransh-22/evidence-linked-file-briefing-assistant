import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders LoginPage with official branding and input fields", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/GOVERNMENT DOCUMENT EVIDENCE INTELLIGENCE & BRIEFING SYSTEM/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. investigator or admin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your confidential password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Authenticate & Access System/i })).toBeInTheDocument();

    // Verify Quick Role Testing buttons are present
    expect(screen.getByText(/Quick Login by Role \(For Testing\)/i)).toBeInTheDocument();
    expect(screen.getByText("Investigating Officer")).toBeInTheDocument();
    expect(screen.getByText("Supervisory Reviewer")).toBeInTheDocument();
    expect(screen.getByText("System Administrator")).toBeInTheDocument();
    expect(screen.getByText("Intake Officer")).toBeInTheDocument();
    expect(screen.getByText("Independent Auditor")).toBeInTheDocument();
  });
});
