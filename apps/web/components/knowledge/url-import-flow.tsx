"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Progress, ScrollArea } from "@chatbot/ui";
import {
  Globe,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

type ImportStep =
  | "input"
  | "crawling"
  | "structuring"
  | "preview"
  | "importing"
  | "success"
  | "error";

interface UrlImportFlowProps {
  projectId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface ScrapedPage {
  id: string;
  url: string;
  title: string;
  wordCount: number;
  preview: string;
  estimatedChunks: number;
  importStatus?: "pending" | "importing" | "completed" | "failed";
  sourceId?: string;
  error?: string;
}

interface ScrapeJob {
  jobId: string;
  status: string;
  domain?: string;
  error?: { code: string; message: string };
  crawlProgress?: {
    pagesFound: number;
    pagesProcessed: number;
    maxPages: number;
  };
  structureProgress?: { total: number; completed: number };
  pages?: ScrapedPage[];
  totals?: { pages: number; words: number; estimatedChunks: number };
}

export function UrlImportFlow({
  projectId,
  onSuccess,
  onClose,
}: UrlImportFlowProps) {
  const [step, setStep] = useState<ImportStep>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  // Poll for job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      const poll = async () => {
        try {
          const response = (await apiClient(
            `/api/knowledge/scrape/${jobId}?projectId=${projectId}`
          )) as ScrapeJob;
          setJob(response);

          if (response.status === "crawling") {
            setStep("crawling");
            setTimeout(poll, 1500);
          } else if (response.status === "structuring") {
            setStep("structuring");
            setTimeout(poll, 1500);
          } else if (response.status === "ready") {
            setStep("preview");
          } else if (response.status === "importing") {
            setStep("importing");
            setTimeout(poll, 1000);
          } else if (response.status === "completed") {
            setStep("success");
          } else if (response.status === "failed") {
            setError(response.error?.message || "Scraping failed");
            setStep("error");
          }
        } catch (err) {
          setError("Failed to check scrape status");
          setStep("error");
        }
      };

      poll();
    },
    [projectId]
  );

  // Start scraping
  const handleStartScrape = async () => {
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    // Add https:// if missing
    let normalizedUrl = url.trim();
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError("Please enter a valid website URL");
      return;
    }

    setError(null);
    setStep("crawling");

    try {
      const response = (await apiClient(
        `/api/knowledge/scrape?projectId=${projectId}`,
        {
          method: "POST",
          body: JSON.stringify({ url: normalizedUrl }),
        }
      )) as ScrapeJob;

      setJob(response);
      pollJobStatus(response.jobId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start scraping"
      );
      setStep("error");
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!job) return;

    setStep("importing");

    try {
      await apiClient(
        `/api/knowledge/scrape/${job.jobId}/import?projectId=${projectId}`,
        {
          method: "POST",
          body: JSON.stringify({ confirm: true }),
        }
      );

      pollJobStatus(job.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import");
      setStep("error");
    }
  };

  // Cancel scrape
  const handleCancel = async () => {
    if (job && ["crawling", "structuring"].includes(step)) {
      try {
        await apiClient(
          `/api/knowledge/scrape/${job.jobId}?projectId=${projectId}`,
          {
            method: "DELETE",
          }
        );
      } catch (err) {
        console.error("Failed to cancel:", err);
      }
    }
    onClose();
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case "input":
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Import from Website</h3>
              <p className="text-sm text-muted-foreground">
                Enter your website URL and we&apos;ll automatically import
                content from your pages.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mybusiness.com"
                onKeyDown={(e) => e.key === "Enter" && handleStartScrape()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll scan up to 10 pages from your website.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleStartScrape}>
                <Globe className="h-4 w-4 mr-2" />
                Scan Website
              </Button>
            </div>
          </div>
        );

      case "crawling":
        return (
          <div className="space-y-4 text-center py-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h3 className="font-semibold text-lg">Scanning your website...</h3>
            {job?.crawlProgress && (
              <div className="space-y-2">
                <Progress
                  value={
                    (job.crawlProgress.pagesFound /
                      job.crawlProgress.maxPages) *
                    100
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Found {job.crawlProgress.pagesFound} pages
                </p>
              </div>
            )}
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        );

      case "structuring":
        return (
          <div className="space-y-4 text-center py-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h3 className="font-semibold text-lg">Structuring content...</h3>
            {job?.structureProgress && (
              <div className="space-y-2">
                <Progress
                  value={
                    (job.structureProgress.completed /
                      job.structureProgress.total) *
                    100
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Processing {job.structureProgress.completed}/
                  {job.structureProgress.total} pages with AI
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Extracting key information and organizing content...
            </p>
          </div>
        );

      case "preview":
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Review imported content</h3>
              <p className="text-sm text-muted-foreground">
                Found {job?.totals?.pages} pages with{" "}
                {job?.totals?.words?.toLocaleString()} words
              </p>
            </div>

            <ScrollArea className="h-[280px] border rounded-lg">
              <div className="p-2 space-y-2">
                {job?.pages?.map((page) => (
                  <div
                    key={page.id}
                    className="border rounded-lg p-3 bg-muted/30"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedPage(
                          expandedPage === page.id ? null : page.id
                        )
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium truncate">
                          {page.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                        <span>{page.wordCount.toLocaleString()} words</span>
                        {expandedPage === page.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    {expandedPage === page.id && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                          {page.preview}
                        </p>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
                        >
                          View original <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-sm text-center text-muted-foreground">
              This will create {job?.totals?.pages} knowledge sources (~
              {job?.totals?.estimatedChunks} chunks)
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleConfirmImport}>
                Import {job?.totals?.pages} Pages
              </Button>
            </div>
          </div>
        );

      case "importing":
        return (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-1">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <h3 className="font-semibold text-lg">Importing content...</h3>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2 px-1">
                {job?.pages?.map((page) => (
                  <div key={page.id} className="flex items-center gap-2 text-sm">
                    {page.importStatus === "completed" ? (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : page.importStatus === "importing" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    ) : page.importStatus === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 flex-shrink-0" />
                    )}
                    <span
                      className={
                        page.importStatus === "completed"
                          ? "text-muted-foreground"
                          : ""
                      }
                    >
                      {page.title}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case "success":
        return (
          <div className="space-y-4 text-center py-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg">Import complete!</h3>
            <p className="text-sm text-muted-foreground">
              Successfully imported {job?.totals?.pages} pages from{" "}
              {job?.domain}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
              >
                Done
              </Button>
              <Button
                onClick={() => (window.location.href = "/playground")}
              >
                Test in Playground
              </Button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="space-y-4 text-center py-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg">Import failed</h3>
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setStep("input");
                  setError(null);
                  setJob(null);
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        );
    }
  };

  return <div className="py-2">{renderStep()}</div>;
}
