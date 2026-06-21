import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useAutoClassifiedIntel } from "./hooks/useAutoClassifiedIntel";
import { useDashboardData } from "./hooks/useDashboardData";
import { useMissionScheduler } from "./hooks/useMissionScheduler";
import { useTrafficWatchRules } from "./hooks/useTrafficWatchRules";

vi.mock("./components/layout/DashboardShell", () => ({
  DashboardShell: () => <div>dashboard shell</div>
}));
vi.mock("./hooks/useAutoClassifiedIntel", () => ({
  useAutoClassifiedIntel: vi.fn()
}));
vi.mock("./hooks/useDashboardData", () => ({
  useDashboardData: vi.fn()
}));
vi.mock("./hooks/useMissionScheduler", () => ({
  useMissionScheduler: vi.fn()
}));
vi.mock("./hooks/useTrafficWatchRules", () => ({
  useTrafficWatchRules: vi.fn()
}));

describe("App", () => {
  it("starts all dashboard side-effect hooks and renders the shell", () => {
    render(<App />);

    expect(useDashboardData).toHaveBeenCalled();
    expect(useAutoClassifiedIntel).toHaveBeenCalled();
    expect(useTrafficWatchRules).toHaveBeenCalled();
    expect(useMissionScheduler).toHaveBeenCalled();
    expect(screen.getByText("dashboard shell")).toBeTruthy();
  });
});
