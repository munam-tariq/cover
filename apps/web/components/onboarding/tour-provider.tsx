"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { OnbordaProvider, Onborda, useOnborda } from "onborda";
import { onboardingTours } from "./tour-steps";
import { TourCard } from "./tour-card";

const STORAGE_KEY = "supportbase-onboarding-completed";

// Context for tour completion - must be at the top level to be accessible from Portal
interface TourContextType {
  completeTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTourContext() {
  return useContext(TourContext);
}

interface TourProviderProps {
  children: React.ReactNode;
}

// Inner component that handles tour start logic
function TourStarter({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { startOnborda, isOnbordaVisible } = useOnborda();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem(STORAGE_KEY);

    // Only show tour on dashboard page and if not completed
    if (!hasCompleted && pathname === "/dashboard") {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        startOnborda("mcp-setup");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, mounted, startOnborda]);

  // Dispatch resize events when tour becomes visible to fix Onborda rendering bug
  // Multiple staggered events ensure the positioning calculation happens after render
  useEffect(() => {
    if (isOnbordaVisible) {
      const dispatchResize = () => window.dispatchEvent(new Event("resize"));
      const timers = [
        setTimeout(dispatchResize, 50),
        setTimeout(dispatchResize, 150),
        setTimeout(dispatchResize, 300),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isOnbordaVisible]);

  return <>{children}</>;
}

export function TourProvider({ children }: TourProviderProps) {
  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  return (
    // TourContext must wrap OnbordaProvider so the Portal can access it
    <TourContext.Provider value={{ completeTour }}>
      <OnbordaProvider>
        <Onborda
          steps={onboardingTours}
          shadowRgb="0, 0, 0"
          shadowOpacity="0.6"
          cardComponent={TourCard}
          cardTransition={{ duration: 0.3, type: "spring" }}
        >
          <TourStarter>{children}</TourStarter>
        </Onborda>
      </OnbordaProvider>
    </TourContext.Provider>
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
