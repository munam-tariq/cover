# Multiple Chatbots Feature Specification

## Metadata
- **Feature ID**: ADV-001
- **Feature Name**: Multiple Chatbots
- **Category**: Advanced
- **Priority**: P2
- **Complexity**: Medium
- **Target Version**: V3
- **Dependencies**: Core chatbot system, User authentication
- **Owner**: Product Team
- **Status**: Planned

## Summary
Enable users to create and manage multiple chatbot projects within a single account. Each project will have its own knowledge base, conversation history, settings, and embedding configuration. This feature allows users to serve different use cases, departments, or clients from one account, with clear project isolation and easy switching between projects.

## User Story
As a Cover user, I want to create and manage multiple chatbot projects in my account so that I can serve different websites, departments, or use cases without mixing their data, settings, or conversations.

## Functional Requirements

### FR-001: Project Creation
- Users can create multiple chatbot projects from the dashboard
- Each project requires a unique name and optional description
- System enforces project limits based on subscription tier (Free: 1, Pro: 5, Enterprise: Unlimited)
- Projects are created with default settings that can be customized

### FR-002: Project Management
- Dashboard displays all projects with key metrics (conversation count, last active, knowledge items)
- Users can switch between projects using a project selector dropdown
- Each project has its own settings page for customization
- Users can rename, archive, or delete projects (with confirmation)
- Deleted projects are soft-deleted and recoverable for 30 days

### FR-003: Project Isolation
- Each project has isolated knowledge base (documents, URLs, scraped content)
- Conversations are segregated by project
- Embeddings and vector stores are project-specific
- Widget customization settings are per-project
- Analytics and reports are project-scoped

### FR-004: Project Switching
- Active project is clearly indicated in the navigation bar
- Switching projects updates the entire dashboard context
- Last viewed project is remembered per user session
- Keyboard shortcut (Cmd/Ctrl + K) opens quick project switcher

### FR-005: Project Embed Code
- Each project generates unique embed code with project-specific API key
- Widget instances are tied to their originating project
- Project API keys can be regenerated independently

### FR-006: Project Templates
- Users can duplicate existing projects to create new ones
- Option to copy settings only or include knowledge base
- Templates for common use cases (Support Bot, Sales Bot, Documentation Bot)

### FR-007: Cross-Project Features
- Global search across all projects (conversations, knowledge base)
- Aggregate analytics view showing metrics across all projects
- Bulk operations (pause/resume multiple projects)

### FR-008: Project Limits & Quotas
- Project-level usage tracking (API calls, storage, conversations)
- Warnings when approaching project limits
- Ability to set per-project quotas on Enterprise tier

## UI Mockup

```
+----------------------------------------------------------+
|  Cover Dashboard                    [User Menu]          |
+----------------------------------------------------------+
|                                                           |
|  [Project Selector: Support Bot v]   [+ New Project]     |
|                                                           |
|  My Projects (3/5)                           [Grid/List]  |
|                                                           |
|  +------------------+  +------------------+              |
|  | Support Bot      |  | Sales Assistant  |              |
|  | 1.2K convos      |  | 340 convos       |              |
|  | Active           |  | Active           |              |
|  | Updated 2h ago   |  | Updated 1d ago   |              |
|  |                  |  |                  |              |
|  | [Open] [Settings]|  | [Open] [Settings]|              |
|  +------------------+  +------------------+              |
|                                                           |
|  +------------------+                                     |
|  | Docs Bot         |                                     |
|  | 89 convos        |                                     |
|  | Paused           |                                     |
|  | Updated 5d ago   |                                     |
|  |                  |                                     |
|  | [Open] [Settings]|                                     |
|  +------------------+                                     |
|                                                           |
+----------------------------------------------------------+

Project Switcher (Cmd+K):
+----------------------------------+
| Search projects...               |
|----------------------------------|
| > Support Bot (1.2K convos)      |
|   Sales Assistant (340 convos)   |
|   Docs Bot (89 convos)           |
|                                  |
|   + Create New Project           |
+----------------------------------+
```

## Technical Approach

### Data Model
```typescript
interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  apiKey: string;
  limits: ProjectLimits;
}

interface ProjectSettings {
  chatbotName: string;
  theme: ThemeConfig;
  behavior: BehaviorConfig;
  language: string;
}

interface ProjectLimits {
  maxConversations?: number;
  maxKnowledgeItems?: number;
  maxStorageMB?: number;
}
```

### Database Schema
- Add `project_id` foreign key to: conversations, knowledge_items, embeddings, settings
- Create `projects` table with metadata and configuration
- Add indexes on `user_id` and `project_id` for efficient queries
- Add composite unique constraint on `user_id, name`

### API Changes
- All existing endpoints receive optional `projectId` parameter (defaults to user's default project)
- New endpoints:
  - `POST /api/projects` - Create project
  - `GET /api/projects` - List user's projects
  - `GET /api/projects/:id` - Get project details
  - `PATCH /api/projects/:id` - Update project
  - `DELETE /api/projects/:id` - Delete project
  - `POST /api/projects/:id/duplicate` - Duplicate project

### Migration Strategy
- Create default project for all existing users with name "Main Project"
- Migrate all existing data to default project
- Add `project_id` to all relevant tables
- No user action required

### Performance Considerations
- Project metadata cached in Redis for fast switching
- Lazy load project-specific data on switch
- Pagination for project lists on Enterprise accounts
- Database connection pooling per project for isolation

## Acceptance Criteria

### AC-001: Project Creation
- Given I am logged in, when I click "New Project", I can create a project with a name
- System prevents duplicate project names within my account
- New project is created with default settings and empty knowledge base
- I am redirected to the new project's dashboard

### AC-002: Project Switching
- Given I have multiple projects, when I use the project selector, all projects are listed
- When I select a project, the entire dashboard context updates to that project
- Active project is clearly indicated in navigation
- Last viewed project is loaded when I log in again

### AC-003: Project Isolation
- Given I have multiple projects, conversations in Project A do not appear in Project B
- Knowledge base items are not shared between projects
- Settings changes in one project do not affect others
- Each project has unique embed code and API key

### AC-004: Project Limits
- Given my subscription tier, I cannot create more projects than allowed
- System displays clear message when limit is reached
- Upgrading subscription increases project limit immediately

### AC-005: Project Deletion
- Given I want to delete a project, system requires confirmation
- Deleted project is soft-deleted and not immediately removed
- I can restore a deleted project within 30 days
- After 30 days, project and all data are permanently deleted

### AC-006: Project Duplication
- Given I have an existing project, I can duplicate it
- I can choose to copy settings only or include knowledge base
- Duplicated project has a new name (e.g., "Copy of Original")
- Conversations are never duplicated

### AC-007: Performance
- Project switching completes in less than 1 second
- Dashboard loads project list in less than 500ms
- Creating a new project completes in less than 2 seconds

## Out of Scope (V4+)
- Project sharing between users
- Project transfer to another account
- Project-level billing/payment
- Project marketplace or templates library
- Cross-project knowledge base sharing

## Success Metrics
- Percentage of users creating 2+ projects within 30 days
- Average time to create first additional project
- Project switching frequency
- Support tickets related to project management

## Questions & Decisions
- **Q**: Should we allow project export/import?
  - **A**: V4 feature, out of scope for initial release

- **Q**: Maximum project name length?
  - **A**: 50 characters

- **Q**: Can projects be reordered?
  - **A**: Yes, drag-and-drop reordering in dashboard (V3)

## References
- [Roadmap: V3 Advanced Features](/docs/product/roadmap.md)
- [User Authentication System](/docs/technical/architecture/auth.md)
- [Database Schema](/docs/technical/database/schema.md)
