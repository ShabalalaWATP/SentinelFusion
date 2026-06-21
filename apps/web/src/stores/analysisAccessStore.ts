import { create } from "zustand";

type AnalysisAccessState = {
  token: string;
  clearToken(): void;
  setToken(token: string): void;
};

const storageKey = "aisstream.analysisAccessToken.v1";

export const useAnalysisAccessStore = create<AnalysisAccessState>((set) => ({
  token: readSessionToken(),
  clearToken: () =>
    set(() => {
      writeSessionToken("");
      return { token: "" };
    }),
  setToken: (token) =>
    set(() => {
      const trimmed = token.trim();
      writeSessionToken(trimmed);
      return { token: trimmed };
    })
}));

export function getAnalysisAccessToken(): string {
  return useAnalysisAccessStore.getState().token;
}

function readSessionToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.sessionStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

function writeSessionToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      window.sessionStorage.setItem(storageKey, token);
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Session persistence is best effort; the in-memory store still works.
  }
}
