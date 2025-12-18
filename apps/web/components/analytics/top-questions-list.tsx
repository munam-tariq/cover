"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@chatbot/ui";
import { HelpCircle } from "lucide-react";

interface QuestionCluster {
  representative: string;
  count: number;
  examples: string[];
}

interface TopQuestionsListProps {
  questions: QuestionCluster[];
  loading: boolean;
}

export function TopQuestionsList({ questions, loading }: TopQuestionsListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Questions</CardTitle>
          <CardDescription>Loading questions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-full bg-muted animate-pulse rounded"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Questions</CardTitle>
          <CardDescription>Most frequently asked questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No questions yet</p>
            <p className="text-sm">
              Common questions will appear here once visitors start chatting
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max count for progress bar scaling
  const maxCount = Math.max(...questions.map((q) => q.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Questions</CardTitle>
        <CardDescription>
          Most frequently asked questions (grouped by similarity)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium truncate">
                      {question.representative}
                    </p>
                  </div>
                  {/* Show similar variations if there are multiple */}
                  {question.count > 1 && question.examples.length > 1 && (
                    <div className="mt-1 ml-8 text-xs text-muted-foreground">
                      <span className="font-medium">Similar:</span>{" "}
                      {question.examples
                        .slice(1, 3)
                        .map((ex, i) => (
                          <span key={i}>
                            "{ex.length > 40 ? ex.slice(0, 40) + "..." : ex}"
                            {i < Math.min(question.examples.length - 2, 1) ? ", " : ""}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <span className="flex-shrink-0 text-sm font-medium tabular-nums">
                  {question.count}
                </span>
              </div>
              {/* Progress bar showing relative frequency */}
              <div className="ml-8 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(question.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
