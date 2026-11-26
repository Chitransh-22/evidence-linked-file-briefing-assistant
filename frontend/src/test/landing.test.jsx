import React from "react";
import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "../app/providers";
import { router } from "../app/router";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../services/api/client";

beforeAll(() => {
  if (typeof globalThis.IntersectionObserver === "undefined") {
    globalThis.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

async function renderAppAt(path) {
  await router.navigate(path);
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

describe("Landing Page & Routing Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: { total: 0, items: [] } });
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders public landing page at / when logged out without dashboard chrome", async () => {
    await renderAppAt("/");

    expect(screen.getByText("EVIDENCE LINKED FILE BRIEFING ASSISTANT")).toBeInTheDocument();
    expect(screen.getByText(/From complex records/i)).toBeInTheDocument();
    expect(screen.getByText(/LEKH transforms complex multilingual government files/i)).toBeInTheDocument();
    expect(screen.getAllByAltText("LEKH logo").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByAltText(/LEKH government files analysis illustration/i)).toBeInTheDocument();
    expect(screen.queryByText(/Operation Clean Ledger/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Access LEKH/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Learn How It Works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How It Works" })).toBeInTheDocument();
    expect(screen.getByText(/From records to a verified briefing\./i)).toBeInTheDocument();
    expect(screen.getByText(/A complete investigation intelligence workspace\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Core Operations/i)).not.toBeInTheDocument();
  });

  it("navigates to /login when clicking Log In in navbar", async () => {
    await renderAppAt("/");

    fireEvent.click(screen.getByRole("button", { name: /Log In/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
    expect(screen.getByText(/Ledger for Evidence and Knowledge Handling/i)).toBeInTheDocument();
  });

  it("navigates to /login from Access LEKH when logged out and /dashboard when logged in", async () => {
    const view = await renderAppAt("/");

    fireEvent.click(screen.getByRole("button", { name: /Access LEKH/i }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
    view.unmount();

    useAuthStore.setState({
      user: { username: "investigator", role: "investigating_officer", full_name: "Investigator" },
      token: "test-jwt",
      isAuthenticated: true,
    });

    await renderAppAt("/");
    fireEvent.click(screen.getByRole("button", { name: /Access LEKH/i }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });

  it("smoothly scrolls to #how-it-works when clicking Learn How It Works", async () => {
    await renderAppAt("/");
    const target = document.getElementById("how-it-works");
    expect(target).toBeTruthy();

    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy;

    fireEvent.click(screen.getByRole("link", { name: /Learn How It Works/i }));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/");
  });

  it("cycles through all 6 pipeline carousel stages via controls and dots", async () => {
    await renderAppAt("/");

    expect(screen.getByText("Document Intake & Routing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next pipeline stage/i }));
    await waitFor(() => {
      expect(screen.getByText("Format Extraction & Dispatch")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /Go to stage 06/i }));
    await waitFor(() => {
      expect(screen.getByText("Briefing Synthesis & Supervisory Review")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Previous pipeline stage/i }));
    await waitFor(() => {
      expect(screen.getByText("Central Evidence Ledger & Intelligence")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated access to protected routes to /login", async () => {
    await renderAppAt("/dashboard");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
  });

  it("redirects to public landing page / after logout and blocks protected routes afterward", async () => {
    useAuthStore.setState({
      user: { username: "admin", role: "system_administrator", full_name: "Admin Officer" },
      token: "test-jwt",
      isAuthenticated: true,
    });

    await renderAppAt("/dashboard");
    expect(screen.getByText(/Executive Operations Dashboard/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/Log out of secure session/i));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("gov_token")).toBeNull();

    // Navigating back to a protected route after logout must redirect to /login
    await act(async () => {
      await router.navigate("/cases");
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
  });
});
