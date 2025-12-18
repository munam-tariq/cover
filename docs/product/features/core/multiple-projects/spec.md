# Multiple Projects Feature Specification

## Metadata
- **Feature ID**: `multiple-projects`
- **Feature Name**: Multiple Projects
- **Category**: Core (promoted from Advanced)
- **Priority**: P0 (Immediate - next feature)
- **Complexity**: Medium
- **Dependencies**: auth-system, database-setup
- **Owner**: Product Team
- **Status**: Ready for Implementation

---

## Summary

Enable users to create and manage multiple chatbot projects within a single account. Each project has isolated data (knowledge base, API endpoints, chat sessions, analytics). Users switch between projects via a header dropdown, with the last selected project persisted in browser storage.

---

## User Story

> As a business owner with multiple websites/brands, I want to manage separate chatbots for each from one account, so I don't need multiple logins and can easily switch between them.

---

## Functional Requirements

### FR-001: Project Switcher (Header Dropdown)

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-001 | Project switcher dropdown appears in header left side | Must Have |
| MP-002 | Dropdown shows all user's projects (excluding deleted) | Must Have |
| MP-003 | Current project is visually indicated (checkmark or highlight) | Must Have |
| MP-004 | Clicking a project switches context and refreshes current page data | Must Have |
| MP-005 | Dropdown includes "+ New Project" action at bottom | Must Have |
| MP-006 | Dropdown includes "View all projects" link to /projects page | Must Have |
| MP-007 | Dropdown shows project name (truncate if >25 chars) | Must Have |

### FR-002: Project Persistence

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-008 | Selected project ID stored in localStorage | Must Have |
| MP-009 | On page load, restore last selected project from localStorage | Must Have |
| MP-010 | If no localStorage or project not found, default to first project | Must Have |
| MP-011 | If user has no projects, redirect to /projects with empty state | Must Have |

### FR-003: Projects Page (`/projects`)

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-012 | Page shows list of all user's projects | Must Have |
| MP-013 | Each list item shows: project name, created date | Must Have |
| MP-014 | Clicking project name switches to it and goes to dashboard | Must Have |
| MP-015 | "Create New Project" button opens creation modal | Must Have |
| MP-016 | Empty state shown if user has no projects | Must Have |

### FR-004: Project Creation

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-017 | Create project modal with: name (required), system prompt (optional) | Must Have |
| MP-018 | Project name: 1-50 characters, required | Must Have |
| MP-019 | System prompt: optional, max 2000 characters | Must Have |
| MP-020 | On success: create project, auto-switch to it, redirect to dashboard | Must Have |
| MP-021 | Show loading state during creation | Must Have |
| MP-022 | Show error toast if creation fails | Must Have |

### FR-005: Project Deletion (Soft Delete)

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-023 | Delete button remains on Settings page only | Must Have |
| MP-024 | Confirmation modal: "Delete [Project Name]?" with warning text | Must Have |
| MP-025 | On delete: set `deleted_at` timestamp, don't actually delete data | Must Have |
| MP-026 | Deleted projects hidden from all queries/UI | Must Have |
| MP-027 | If deleting current project, switch to first available project | Must Have |
| MP-028 | If no projects remain after delete, redirect to /projects | Must Have |

### FR-006: Data Isolation

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-029 | All dashboard pages show only current project's data | Must Have |
| MP-030 | Knowledge, API endpoints, Analytics, Playground scoped to project | Must Have |
| MP-031 | No possibility of data leakage between projects | Must Have |
| MP-032 | Embed code unique per project (already implemented) | Must Have |

---

## UI Design

### Header with Project Switcher

```
┌─────────────────────────────────────────────────────────────────┐
│ [▼ Support Bot     ]              [Analytics] [?] [Avatar ▼]   │
└─────────────────────────────────────────────────────────────────┘
         ↓ (on click)
┌────────────────────────┐
│ ✓ Support Bot          │  ← Current (highlighted)
│   Sales Assistant      │
│   Documentation Bot    │
│ ────────────────────── │
│ + New Project          │
│ View all projects →    │
└────────────────────────┘
```

### Projects Page (`/projects`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Projects                              [+ Create New Project]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Support Bot                              Created Dec 15, 2024││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Sales Assistant                          Created Dec 18, 2024││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Documentation Bot                        Created Dec 18, 2024││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Create Project Modal

```
┌─────────────────────────────────────────┐
│ Create New Project                   ✕  │
├─────────────────────────────────────────┤
│                                         │
│ Project Name *                          │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ Give your chatbot a name                │
│                                         │
│ System Prompt (optional)                │
│ ┌─────────────────────────────────────┐ │
│ │ You are a helpful assistant for...  │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ Instructions for how your chatbot       │
│ should behave. You can change this      │
│ later in Settings.                      │
│                                         │
├─────────────────────────────────────────┤
│              [Cancel]  [Create Project] │
└─────────────────────────────────────────┘
```

### Delete Confirmation Modal

```
┌─────────────────────────────────────────┐
│ Delete Project                       ✕  │
├─────────────────────────────────────────┤
│                                         │
│ Are you sure you want to delete         │
│ "Support Bot"?                          │
│                                         │
│ This will remove the project and all    │
│ its data including knowledge sources,   │
│ API endpoints, and chat history.        │
│                                         │
├─────────────────────────────────────────┤
│              [Cancel]  [Delete Project] │
└─────────────────────────────────────────┘
```

---

## Technical Approach

### Database Changes

```sql
-- Migration: add_soft_delete_to_projects
-- Add soft delete support to projects table

ALTER TABLE projects
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX idx_projects_user_active
ON projects(user_id)
WHERE deleted_at IS NULL;
```

### API Changes

#### GET /api/projects (update existing)
- Filter out `deleted_at IS NOT NULL`
- Return all user's active projects
- Response: `{ projects: Project[] }`

#### POST /api/projects (new endpoint)
- Create new project with name, optional settings
- Request body: `{ name: string, systemPrompt?: string }`
- Response: `{ project: Project }`
- Validation:
  - Name required, 1-50 characters
  - System prompt optional, max 2000 characters

#### DELETE /api/projects/:id (update existing)
- Soft delete: `UPDATE projects SET deleted_at = NOW() WHERE id = $1`
- Validate project belongs to user
- Response: `{ success: true }`

### Frontend Architecture

#### ProjectContext (React Context)

```typescript
// apps/web/contexts/project-context.tsx

interface ProjectContextValue {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  switchProject: (projectId: string) => void;
  createProject: (data: CreateProjectData) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const STORAGE_KEY = 'cover_selected_project_id';

// Project Selection Logic:
// 1. On app load, fetch all projects
// 2. Read localStorage for selected project ID
// 3. If found and valid → use it
// 4. If not found or invalid → use first project
// 5. If no projects exist → redirect to /projects
// 6. Store selected project ID in localStorage on change
```

#### Component Hierarchy

```
DashboardLayout
├── ProjectProvider (context)
│   ├── Header
│   │   ├── ProjectSwitcher (dropdown)
│   │   └── UserMenu
│   └── {children} (all dashboard pages)
```

### Files to Create

| File | Purpose |
|------|---------|
| `apps/web/contexts/project-context.tsx` | Project state management |
| `apps/web/components/layout/project-switcher.tsx` | Header dropdown component |
| `apps/web/app/(dashboard)/projects/page.tsx` | Projects list page |
| `apps/web/components/projects/create-project-modal.tsx` | Creation modal |
| `apps/web/components/projects/project-list.tsx` | Projects list component |

### Files to Modify

| File | Changes |
|------|---------|
| `apps/web/components/layout/header.tsx` | Add ProjectSwitcher to left side |
| `apps/web/components/layout/sidebar.tsx` | Add "Projects" nav link |
| `apps/web/app/(dashboard)/layout.tsx` | Wrap with ProjectProvider |
| `apps/web/app/(dashboard)/settings/page.tsx` | Update delete to use soft delete + redirect |
| `apps/api/src/routes/projects.ts` | Add POST endpoint, update DELETE for soft delete |
| `packages/db/src/types.ts` | Regenerate after migration |

### Data Flow

```
User clicks project in dropdown
         ↓
ProjectContext.switchProject(projectId)
         ↓
Update localStorage with new projectId
         ↓
Update currentProject in context
         ↓
All child components re-render with new project
         ↓
Pages fetch data using currentProject.id
```

---

## Acceptance Criteria

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AC-001 | User opens project dropdown | Sees all their projects with current one highlighted |
| AC-002 | User clicks different project | Dashboard refreshes with that project's data |
| AC-003 | User closes browser, returns later | Same project selected as before (from localStorage) |
| AC-004 | User clears localStorage, returns | First project selected by default |
| AC-005 | User creates new project | Modal works, project created, auto-switched to new project |
| AC-006 | User deletes current project | Redirected to first available project |
| AC-007 | User deletes only project | Redirected to /projects with empty state |
| AC-008 | User views Knowledge page | Only sees current project's knowledge sources |
| AC-009 | User views Analytics | Only sees current project's analytics |
| AC-010 | User views API Endpoints | Only sees current project's endpoints |
| AC-011 | User opens Playground | Chat uses current project's knowledge/config |
| AC-012 | User views Embed page | Shows embed code for current project |

---

## Out of Scope (Future Versions)

- Project limits per subscription tier (add with billing)
- Project duplication/templates
- Cross-project search
- Cmd+K quick switcher keyboard shortcut
- Project reordering/sorting
- Hard delete / permanent data removal
- Project archiving (separate from delete)
- Project transfer between accounts
- Project sharing with team members

---

## Migration Strategy

**No migration needed for existing users:**
- All existing users already have 1 project ("My Chatbot")
- Database already has `project_id` foreign keys on all tables
- Just deploy new UI components and soft delete column

**Database migration:**
1. Add `deleted_at` column to projects table
2. Add index for efficient filtering
3. Regenerate TypeScript types

---

## Testing Checklist

### Unit Tests
- [ ] ProjectContext correctly manages state
- [ ] localStorage persistence works
- [ ] Project selection logic handles edge cases

### Integration Tests
- [ ] Create project API works
- [ ] Soft delete API works
- [ ] Projects list API filters deleted projects

### E2E Tests (Playwright)
- [ ] Project switcher dropdown opens/closes
- [ ] Switching projects updates all dashboard data
- [ ] Creating new project works end-to-end
- [ ] Deleting project redirects correctly
- [ ] localStorage persistence across sessions

---

## Success Metrics

- Users with 2+ projects within 30 days of feature launch
- Project switching frequency per user session
- Time from signup to second project creation
- Support tickets related to project management

---

## References

- [Original V3 Spec](/docs/product/features/advanced/multiple-chatbots/spec.md) - Full feature vision for later
- [Database Schema](/packages/db/src/types.ts) - Current schema
- [Auth System](/docs/product/features/infrastructure/auth-system/spec.md) - User authentication

---

**Document Version**: 1.0
**Created**: December 2024
**Author**: Product Team
