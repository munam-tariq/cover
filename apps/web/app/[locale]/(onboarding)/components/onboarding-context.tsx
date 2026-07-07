"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface OnboardingState {
  agentName: string;
  companyName: string;
  systemPrompt: string;
  websiteUrl: string;
  projectId: string | null;
  jobId: string | null;
  logoUrl: string | null;
  domain: string | null;
}

interface OnboardingContextType {
  state: OnboardingState;
  setAgentName: (name: string) => void;
  setCompanyName: (name: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setWebsiteUrl: (url: string) => void;
  setProjectId: (id: string) => void;
  setJobId: (id: string) => void;
  setLogoUrl: (url: string) => void;
  setDomain: (domain: string) => void;
  reset: () => void;
}

const initialState: OnboardingState = {
  agentName: "",
  companyName: "",
  systemPrompt: "",
  websiteUrl: "",
  projectId: null,
  jobId: null,
  logoUrl: null,
  domain: null,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    // Try to restore state from sessionStorage
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("cover_onboarding_state");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return initialState;
  });

  // Persist state changes to sessionStorage
  const persistState = useCallback((newState: OnboardingState) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cover_onboarding_state", JSON.stringify(newState));
    }
  }, []);

  const setAgentName = useCallback(
    (name: string) => {
      setState((prev) => {
        const newState = { ...prev, agentName: name };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setCompanyName = useCallback(
    (name: string) => {
      setState((prev) => {
        const newState = { ...prev, companyName: name };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setSystemPrompt = useCallback(
    (prompt: string) => {
      setState((prev) => {
        const newState = { ...prev, systemPrompt: prompt };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setWebsiteUrl = useCallback(
    (url: string) => {
      setState((prev) => {
        const newState = { ...prev, websiteUrl: url };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setProjectId = useCallback(
    (id: string) => {
      setState((prev) => {
        const newState = { ...prev, projectId: id };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setJobId = useCallback(
    (id: string) => {
      setState((prev) => {
        const newState = { ...prev, jobId: id };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setLogoUrl = useCallback(
    (url: string) => {
      setState((prev) => {
        const newState = { ...prev, logoUrl: url };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const setDomain = useCallback(
    (domain: string) => {
      setState((prev) => {
        const newState = { ...prev, domain: domain };
        persistState(newState);
        return newState;
      });
    },
    [persistState]
  );

  const reset = useCallback(() => {
    setState(initialState);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("cover_onboarding_state");
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setAgentName,
        setCompanyName,
        setSystemPrompt,
        setWebsiteUrl,
        setProjectId,
        setJobId,
        setLogoUrl,
        setDomain,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
