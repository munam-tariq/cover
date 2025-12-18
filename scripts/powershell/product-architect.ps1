# Product Architect - Setup script for product ideation sessions
# Creates output directories for product documentation artifacts

param(
    [switch]$Json,
    [string]$ProductName = ""
)

$ErrorActionPreference = "Stop"

# Get repository root
function Get-RepoRoot {
    try {
        $root = git rev-parse --show-toplevel 2>$null
        if ($root) { return $root }
    } catch { }
    return (Get-Location).Path
}

# Ensure directory exists
function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Host "[INFO] Created directory: $Path" -ForegroundColor Blue
    }
}

# Logging functions
function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Main execution
$RepoRoot = Get-RepoRoot

Write-Info "Setting up Product Architect session..."

# Define output directories
$OutputBase = Join-Path $RepoRoot "docs\product"
$SessionDir = Join-Path $OutputBase "sessions"
$SpecsDir = Join-Path $OutputBase "specs"
$ResearchDir = Join-Path $OutputBase "research"
$FeaturesDir = Join-Path $SpecsDir "features"

# Create directories
Ensure-Directory $OutputBase
Ensure-Directory $SessionDir
Ensure-Directory $SpecsDir
Ensure-Directory $ResearchDir
Ensure-Directory $FeaturesDir

# Generate session ID
$SessionId = Get-Date -Format "yyyyMMdd-HHmmss"

# Define output paths
$SessionFile = Join-Path $SessionDir "session-$SessionId.md"
$BriefFile = Join-Path $SpecsDir "product-brief.md"
$RoadmapFile = Join-Path $SpecsDir "roadmap.md"

if ($Json) {
    # Output JSON for command consumption
    $result = @{
        SESSION_ID = $SessionId
        OUTPUT_BASE = $OutputBase
        SESSION_DIR = $SessionDir
        SESSION_FILE = $SessionFile
        SPECS_DIR = $SpecsDir
        BRIEF_FILE = $BriefFile
        ROADMAP_FILE = $RoadmapFile
        FEATURES_DIR = $FeaturesDir
        RESEARCH_DIR = $ResearchDir
        REPO_ROOT = $RepoRoot
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Success "Product Architect session ready"
    Write-Host ""
    Write-Host "Session ID: $SessionId"
    Write-Host "Output directory: $OutputBase"
    Write-Host ""
    Write-Host "Available output locations:"
    Write-Host "  - Session notes: $SessionFile"
    Write-Host "  - Product brief: $BriefFile"
    Write-Host "  - Roadmap: $RoadmapFile"
    Write-Host "  - Feature specs: $FeaturesDir\"
    Write-Host "  - Research: $ResearchDir\"
}
