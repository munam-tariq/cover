export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your chatbot command center
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Total Messages
          </div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Knowledge Sources
          </div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            API Endpoints
          </div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">
            Response Rate
          </div>
          <div className="text-2xl font-bold">-</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
              1
            </span>
            <span>Upload your knowledge base (PDFs, text files)</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
              2
            </span>
            <span>Configure API endpoints for live data</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
              3
            </span>
            <span>Get your embed code and add to your website</span>
          </div>
        </div>
      </div>
    </div>
  );
}
