# Feature Builder Setup Script
# Provides environment info and paths for the feature-builder command

param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

# Get repository root
function Get-RepoRoot {
    $gitRoot = git rev-parse --show-toplevel 2>$null
    if ($gitRoot) {
        return $gitRoot
    }
    return (Get-Location).Path
}

$RepoRoot = Get-RepoRoot
$SpecsDir = Join-Path $RepoRoot "docs/product/features"
$ArchitectureFile = Join-Path $RepoRoot "docs/product/architecture/system-overview.md"
$RoadmapFile = Join-Path $RepoRoot "docs/product/roadmap.md"
$IndexFile = Join-Path $RepoRoot "docs/product/features/_index.md"
$ProgressFile = Join-Path $RepoRoot "docs/product/features/progress.md"

# Check if index and progress files exist
$IndexExists = Test-Path $IndexFile
$ProgressExists = Test-Path $ProgressFile

# Find available specs
$AvailableSpecs = @()
if (Test-Path $SpecsDir) {
    $AvailableSpecs = Get-ChildItem -Path $SpecsDir -Recurse -Filter "spec.md" |
        ForEach-Object {
            $_.FullName.Replace("$SpecsDir\", "").Replace("\spec.md", "").Replace("/", "\")
        } | Sort-Object
}

# Check for source directories
$SrcDir = ""
$ComponentsDir = ""
$ApiDir = ""

if (Test-Path (Join-Path $RepoRoot "src")) {
    $SrcDir = Join-Path $RepoRoot "src"
} elseif (Test-Path (Join-Path $RepoRoot "app")) {
    $SrcDir = Join-Path $RepoRoot "app"
}

if (Test-Path (Join-Path $RepoRoot "src/components")) {
    $ComponentsDir = Join-Path $RepoRoot "src/components"
} elseif (Test-Path (Join-Path $RepoRoot "components")) {
    $ComponentsDir = Join-Path $RepoRoot "components"
} elseif (Test-Path (Join-Path $RepoRoot "app/components")) {
    $ComponentsDir = Join-Path $RepoRoot "app/components"
}

if (Test-Path (Join-Path $RepoRoot "src/app/api")) {
    $ApiDir = Join-Path $RepoRoot "src/app/api"
} elseif (Test-Path (Join-Path $RepoRoot "app/api")) {
    $ApiDir = Join-Path $RepoRoot "app/api"
} elseif (Test-Path (Join-Path $RepoRoot "pages/api")) {
    $ApiDir = Join-Path $RepoRoot "pages/api"
}

# Check for config files
$HasSupabase = (Test-Path (Join-Path $RepoRoot "supabase/config.toml")) -or (Test-Path (Join-Path $RepoRoot "supabase"))
$HasTailwind = (Test-Path (Join-Path $RepoRoot "tailwind.config.js")) -or (Test-Path (Join-Path $RepoRoot "tailwind.config.ts"))
$HasTypeScript = Test-Path (Join-Path $RepoRoot "tsconfig.json")

if ($Json) {
    $result = @{
        REPO_ROOT = $RepoRoot
        SPECS_DIR = $SpecsDir
        INDEX_FILE = $IndexFile
        INDEX_EXISTS = $IndexExists.ToString().ToLower()
        PROGRESS_FILE = $ProgressFile
        PROGRESS_EXISTS = $ProgressExists.ToString().ToLower()
        ARCHITECTURE_FILE = $ArchitectureFile
        ROADMAP_FILE = $RoadmapFile
        AVAILABLE_SPECS = ($AvailableSpecs -join ",")
        SRC_DIR = $SrcDir
        COMPONENTS_DIR = $ComponentsDir
        API_DIR = $ApiDir
        HAS_SUPABASE = $HasSupabase.ToString().ToLower()
        HAS_TAILWIND = $HasTailwind.ToString().ToLower()
        HAS_TYPESCRIPT = $HasTypeScript.ToString().ToLower()
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Host "[INFO] Feature Builder Environment" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Repository Root: $RepoRoot"
    Write-Host "Specs Directory: $SpecsDir"
    Write-Host ""
    Write-Host "Progress Tracking:"
    Write-Host "  Index file: $IndexFile (exists: $IndexExists)"
    Write-Host "  Progress file: $ProgressFile (exists: $ProgressExists)"
    Write-Host ""
    Write-Host "Available Feature Specs:"
    if ($AvailableSpecs.Count -gt 0) {
        foreach ($spec in $AvailableSpecs) {
            Write-Host "  - $spec"
        }
    } else {
        Write-Host "  (no specs found)"
    }
    Write-Host ""
    Write-Host "Source Directories:"
    Write-Host "  src: $(if ($SrcDir) { $SrcDir } else { 'not found' })"
    Write-Host "  components: $(if ($ComponentsDir) { $ComponentsDir } else { 'not found' })"
    Write-Host "  api: $(if ($ApiDir) { $ApiDir } else { 'not found' })"
    Write-Host ""
    Write-Host "Project Configuration:"
    Write-Host "  Supabase: $HasSupabase"
    Write-Host "  Tailwind: $HasTailwind"
    Write-Host "  TypeScript: $HasTypeScript"
}
