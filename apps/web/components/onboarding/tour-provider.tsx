"use client";

import { OnbordaProvider, Onborda, useOnborda } from "onborda";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

import { useProject } from "@/contexts/project-context";
import { usePathname } from "@/i18n/navigation";

import { TourCard } from "./tour-card";
import { useOnboardingTours } from "./tour-steps";

const STORAGE_KEY = "supportbase-onboarding-completed";
const TOUR_NAME = "mcp-setup";

// Context for tour completion - must wrap <Onborda> so the Portal can access it
interface TourContextType {
  completeTour: () => void;
  restartTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTourContext() {
  return useContext(TourContext);
}

interface TourProviderProps {
  children: React.ReactNode;
}

// Lives inside OnbordaProvider so it can drive the tour directly, and wraps
// <Onborda> so the portalled TourCard still reads TourContext.
function TourController({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { startOnborda, isOnbordaVisible } = useOnborda();
  const autoStartedRef = useRef(false);

  const startTour = useCallback(() => {
    startOnborda(TOUR_NAME);
    // Dispatch resize events after starting to fix Onborda positioning
    const dispatchResize = () => window.dispatchEvent(new Event("resize"));
    setTimeout(dispatchResize, 100);
    setTimeout(dispatchResize, 300);
    setTimeout(dispatchResize, 500);
  }, [startOnborda]);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    autoStartedRef.current = true;
    startTour();
  }, [startTour]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // usePathname is locale-aware, so this matches /dashboard and /ar/dashboard.
    if (pathname !== "/dashboard") return;

    // Auto-start at most once per mount. The tour navigates away to the General
    // tab by design, so without this guard coming back to the dashboard would
    // restart it from step 1 and make it impossible to finish.
    if (autoStartedRef.current) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    autoStartedRef.current = true;

    // Use requestAnimationFrame + timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(startTour);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname, mounted, startTour]);

  // Dispatch resize events when tour becomes visible to fix Onborda rendering bug
  // Multiple staggered events ensure the positioning calculation happens after render
  useEffect(() => {
    if (isOnbordaVisible) {
      const dispatchResize = () => window.dispatchEvent(new Event("resize"));
      const timers = [
        setTimeout(dispatchResize, 50),
        setTimeout(dispatchResize, 150),
        setTimeout(dispatchResize, 300),
        setTimeout(dispatchResize, 600),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isOnbordaVisible]);

  const value = useMemo(
    () => ({ completeTour, restartTour }),
    [completeTour, restartTour]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function TourProvider({ children }: TourProviderProps) {
  const { currentProject } = useProject();
  const steps = useOnboardingTours(currentProject?.id ?? null);

  return (
    <OnbordaProvider>
      <TourController>
        <Onborda
          steps={steps}
          shadowRgb="0, 0, 0"
          shadowOpacity="0.6"
          cardComponent={TourCard}
          cardTransition={{ duration: 0.3, type: "spring" }}
        >
          {children}
        </Onborda>
      </TourController>
    </OnbordaProvider>
  );
}

// Export utility to reset onboarding (useful for testing or "show tour again")
export function resetOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Export utility to check if onboarding was completed
export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}
