"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@chatbot/ui";
import { cn } from "@chatbot/ui";

interface StepCardProps {
  children: ReactNode;
  className?: string;
}

export function StepCard({ children, className }: StepCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className={cn("w-full max-w-md shadow-lg border-0 bg-card/95 backdrop-blur", className)}>
        <CardContent className="p-8">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

interface StepHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function StepHeader({ title, description, icon }: StepHeaderProps) {
  return (
    <div className="text-center mb-6">
      {icon && (
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      )}
    </div>
  );
}

interface StepActionsProps {
  children: ReactNode;
  className?: string;
}

export function StepActions({ children, className }: StepActionsProps) {
  return (
    <div className={cn("flex items-center gap-3 mt-6", className)}>
      {children}
    </div>
  );
}
