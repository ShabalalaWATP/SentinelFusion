import { DashboardShell } from "./components/layout/DashboardShell";
import { useAutoClassifiedIntel } from "./hooks/useAutoClassifiedIntel";
import { useDashboardData } from "./hooks/useDashboardData";
import { useMissionScheduler } from "./hooks/useMissionScheduler";
import { useTrafficWatchRules } from "./hooks/useTrafficWatchRules";

export function App() {
  useDashboardData();
  useAutoClassifiedIntel();
  useTrafficWatchRules();
  useMissionScheduler();

  return <DashboardShell />;
}
