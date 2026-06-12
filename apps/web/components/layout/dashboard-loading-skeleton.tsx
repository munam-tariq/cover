import { Skeleton } from "@chatbot/ui";

export function DashboardLoadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-6 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-[70vw]" />
        </div>
        <Skeleton className="h-10 w-28 sm:w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>

      <Skeleton className="h-[min(26rem,50vh)] w-full" />
    </div>
  );
}
