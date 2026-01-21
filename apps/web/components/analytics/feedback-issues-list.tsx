"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chatbot/ui";
import { AlertTriangle, ThumbsDown, Clock } from "lucide-react";

interface FeedbackIssue {
  questionText: string;
  sampleAnswer: string;
  unhelpfulCount: number;
  totalOccurrences: number;
  lastOccurred: string;
}

interface FeedbackIssuesListProps {
  issues: FeedbackIssue[];
  loading: boolean;
}

export function FeedbackIssuesList({ issues, loading }: FeedbackIssuesListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Responses Needing Attention
          </CardTitle>
          <CardDescription>Loading issues...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Responses Needing Attention
          </CardTitle>
          <CardDescription>
            Questions with the most negative feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-lg font-medium">No issues found</p>
            <p className="text-sm mt-1">
              Great job! No responses have received negative feedback yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  // Truncate text with ellipsis
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Responses Needing Attention
        </CardTitle>
        <CardDescription>
          Questions with the most negative feedback - consider improving your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {issues.map((issue, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Question */}
                  <p className="font-medium text-sm">
                    "{truncate(issue.questionText, 100)}"
                  </p>

                  {/* Sample answer */}
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    AI Response: {truncate(issue.sampleAnswer, 150)}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1 text-red-600">
                    <ThumbsDown className="h-4 w-4" />
                    <span className="font-semibold">{issue.unhelpfulCount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(issue.lastOccurred)}
                  </div>
                </div>
              </div>

              {/* Action hint */}
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600" />
                Tip: Review your knowledge base for related content
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
