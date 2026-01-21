# Feature Implementation Progress

## Overview
- **Total Features**: 26
- **Completed**: 14
- **In Progress**: 0
- **Planned**: 4 (Quick Questions, Micro-Surveys, Smart Lead Capture, Message Analytics)
- **Remaining**: 8 (V2/V3 features)

## Currently In Progress

(none)

## Planned Features

### Message Analytics Metadata ✅ IMPLEMENTED
- **Status**: Implemented (Jan 2025)
- **Spec**: [message-analytics/spec.md](./message-analytics/spec.md)
- **Summary**: Capture contextual metadata with each chat message for analytics, reporting, and user insights. Includes device info (browser, OS, device type), page context (URL, title, referrer), and geolocation (country, city from IP).
- **Implementation**:
  - Widget: `device-info.ts` collects browser, OS, device, page context
  - API: `ip-geo.ts` service for IP geolocation via ip-api.com
  - Storage: `messages.metadata` JSONB and `customers` table fields (last_browser, last_device, last_os, last_page_url, last_location)
- **Dependencies**: widget ✅, chat-engine ✅

---

### Quick Questions / Suggested Starters
- **Status**: Spec Complete, Ready for Implementation
- **Spec**: [quick-questions/spec.md](./quick-questions/spec.md)
- **Summary**: Display clickable question suggestions near chat bubble and inside chat window to help users start conversations with one click. Supports static (manual), analytics (auto from top questions), and hybrid modes.
- **Dependencies**: widget ✅, chat-analytics ✅

---

### Micro-Surveys (Delightful Feedback)
- **Status**: Spec Complete, Ready for Implementation
- **Spec**: [micro-surveys/spec.md](./micro-surveys/spec.md)
- **Summary**: Floating popup surveys with delightful illustrated shapes (happy blob, cool sunglasses, meh face, sad drop, angry spike, etc.) for collecting user feedback. Triggers based on events (conversation end, page exit, time-based). Lightweight alternative to traditional surveys.
- **Key Features**:
  - 10 illustrated SVG mood shapes with animations
  - Question types: mood selection, star rating, NPS, text feedback
  - Smart triggers: after conversation, on page exit, time-based
  - Dashboard for creating/managing surveys and viewing responses
- **Dependencies**: widget ✅

---

### Smart Lead Capture (Pre-Chat vs In-Chat)
- **Status**: Research Complete, Spec Ready
- **Spec**: [lead-capture/spec.md](./lead-capture/spec.md)
- **Summary**: Research and recommendations on email collection strategy. Industry consensus: DON'T gate conversations with pre-chat forms. Recommends smart in-chat email capture triggered contextually (after value delivered, when bot can't answer, before handoff).
- **Key Findings**:
  - Pre-chat forms cause 40%+ abandonment
  - Chatbots convert 3x better than forms
  - Progressive profiling (ask during chat) is best practice
  - All major competitors make pre-chat forms optional
- **Recommendation**: Implement smart contextual email capture, NOT mandatory pre-chat forms
- **Dependencies**: lead-capture (existing) ✅, widget ✅

---

## Immediate Priority Queue (Team Decision - Dec 2024)

The following features have been prioritized for immediate implementation:

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | `multiple-projects` | ✅ Completed | Promoted from V3 - project switcher, multi-project support |
| 2 | `lead-capture` | ✅ Completed | Email capture when chatbot can't answer |
| 3 | `url-scraping` | ✅ Completed | Import knowledge from website URL via Firecrawl + LLM structuring |

These features take priority over the remaining Enhanced (V2) features.

---

## Testing Status

### E2E Tested (Playwright) ✅
| Feature | Test Date | Status |
|---------|-----------|--------|
| Authentication - Magic Link Login | 2025-12-17 | ✅ Pass |
| Authentication - Auto Project Creation | 2025-12-17 | ✅ Pass |
| Knowledge - Add Text Content | 2025-12-17 | ✅ Pass |
| Knowledge - Upload TXT File | 2025-12-17 | ✅ Pass |
| Knowledge - Upload PDF File | 2025-12-17 | ✅ Pass |
| Knowledge - Delete Source | 2025-12-17 | ✅ Pass |
| Knowledge - View Text Content | 2025-12-17 | ✅ Pass |
| Knowledge - Download TXT File | 2025-12-17 | ✅ Pass |
| Knowledge - Download PDF File | 2025-12-17 | ✅ Pass |
| Knowledge - Error Handling (Invalid PDF) | 2025-12-17 | ✅ Pass |
| Settings - Load Project Data | 2025-12-17 | ✅ Pass |
| Settings - Save Name/System Prompt | 2025-12-17 | ✅ Pass |
| Settings - Copy Project ID | 2025-12-17 | ✅ Pass |
| API Endpoints - Empty State Display | 2025-12-17 | ✅ Pass |
| API Endpoints - Add Endpoint (No Auth) | 2025-12-17 | ✅ Pass |
| API Endpoints - Test Endpoint (No Auth) | 2025-12-17 | ✅ Pass |
| API Endpoints - Edit Endpoint | 2025-12-17 | ✅ Pass |
| API Endpoints - Add Endpoint (Bearer Token) | 2025-12-17 | ✅ Pass |
| API Endpoints - Add Endpoint (API Key) | 2025-12-17 | ✅ Pass |
| API Endpoints - Test Endpoint (API Key) | 2025-12-17 | ✅ Pass |
| API Endpoints - Delete Endpoint | 2025-12-17 | ✅ Pass |
| Multiple Projects - Project Switcher Dropdown | 2025-12-18 | ✅ Pass |
| Multiple Projects - Switch Projects (Page Refresh) | 2025-12-18 | ✅ Pass |
| Multiple Projects - Knowledge Data Isolation | 2025-12-18 | ✅ Pass |
| Multiple Projects - API Endpoints Data Isolation | 2025-12-18 | ✅ Pass |
| Multiple Projects - Analytics Data Isolation | 2025-12-18 | ✅ Pass |
| Multiple Projects - Add Knowledge to Specific Project | 2025-12-18 | ✅ Pass |
| Multiple Projects - localStorage Persistence | 2025-12-18 | ✅ Pass |

### Not Yet Tested ⚠️
| Feature | Notes |
|---------|-------|
| Settings - Delete Project | Implemented, skipped (destructive action) |

---

## Dashboard Enhancements (Non-Feature)

### Dashboard Stats & Onboarding Progress ✅
- **Date**: 2025-12-18
- **Summary**: Enhanced the dashboard with real-time stats and an onboarding progress tracker to guide new users through setup.
- **Changes**:
  1. **Real-time Stats Cards** - Dashboard now fetches actual data:
     - Total Messages (from analytics API)
     - Knowledge Sources count
     - API Endpoints count
     - Response Rate
  2. **Setup Progress Card** - Visual onboarding checklist:
     - Shows "X/4 complete" with progress bar
     - Four steps: Account created, Knowledge added, Playground tested, Widget embedded
     - Completed steps show checkmark and strikethrough
     - Incomplete steps are clickable and link to relevant page
     - Card hides when setup is 100% complete
  3. **Source Tracking** - Added `source` column to `chat_sessions` table:
     - Tracks where chat sessions originate: `widget`, `playground`, `mcp`, `api`
     - Used to detect if widget is successfully embedded
- **Key Files**:
  - `apps/web/app/(dashboard)/page.tsx` - Dashboard with stats and onboarding
  - `apps/api/src/routes/projects.ts` - Added `/api/projects/onboarding` endpoint
  - `apps/api/src/services/chat-engine.ts` - Added source parameter support
  - `packages/ui/src/components/progress.tsx` - New Progress component
- **Database Migration**: `add_source_to_chat_sessions` - Added source column

---

## Completed Features

### #14: message-analytics ✅
- **Started**: 2025-01-22
- **Completed**: 2025-01-22
- **Category**: enhanced
- **Summary**: Capture contextual metadata with each chat message for analytics, reporting, and user insights. Collects device info, page context, and geolocation to help businesses understand their customers better.
- **Key Files**:
  - `apps/widget/src/utils/device-info.ts` - NEW: Device detection utility (browser, OS, device type, page context)
  - `apps/widget/src/utils/api.ts` - MODIFIED: Added context to message payload
  - `apps/api/src/services/ip-geo.ts` - NEW: IP geolocation service using ip-api.com
  - `apps/api/src/routes/chat.ts` - MODIFIED: Captures IP, calls geolocation, merges context
  - `apps/api/src/services/chat-engine.ts` - MODIFIED: Added MessageContext type, passes context through
  - `apps/api/src/services/conversation.ts` - MODIFIED: Updates customers table and stores context in message metadata
  - `docs/product/features/message-analytics/spec.md` - Full product specification
- **Data Captured**:
  - **Per Message** (in `messages.metadata` JSONB):
    - pageUrl, pageTitle, referrer
    - browser, os, device
    - country, city, timezone
  - **Per Customer** (in `customers` table):
    - last_browser (e.g., "Chrome 120")
    - last_device ("desktop" | "mobile" | "tablet")
    - last_os (e.g., "macOS 14.2")
    - last_page_url
    - last_location (e.g., "San Francisco, United States")
- **Features**:
  - Browser detection (Chrome, Firefox, Edge, Safari, Opera)
  - OS detection (Windows, macOS, Linux, Android, iOS)
  - Device type detection (desktop, mobile, tablet)
  - Page context (URL, title, referrer)
  - IP geolocation via free ip-api.com service (no API key needed)
  - Privacy-conscious: skips localhost/private IPs, strips sensitive URL params
- **Notes**: Geolocation only works for public IPs. Dashboard UI for viewing this data is a future enhancement.

---

### #13: human-handoff ✅
- **Started**: 2025-01-15
- **Completed**: 2025-01-18
- **Category**: enhanced
- **Summary**: Implemented comprehensive human agent handoff system allowing customers to request live agent support when the AI chatbot cannot help. Includes agent management, conversation routing, queue system, business hours, and real-time messaging infrastructure.
- **Key Files**:
  - `apps/api/src/routes/handoff.ts` - Handoff API routes (trigger, queue, claim, transfer, resolve)
  - `apps/api/src/routes/handoff-settings.ts` - Handoff settings API (business hours, triggers, routing)
  - `apps/api/src/routes/agent.ts` - Agent management routes (status, availability)
  - `apps/api/src/routes/conversations.ts` - Conversation management routes
  - `apps/api/src/services/handoff-trigger.ts` - Trigger detection service
  - `apps/api/src/services/realtime.ts` - Supabase Realtime broadcast functions
  - `apps/widget/src/utils/handoff.ts` - Widget handoff utilities
  - `apps/web/app/(dashboard)/inbox/page.tsx` - Agent inbox page
  - `apps/web/app/(dashboard)/inbox/[id]/page.tsx` - Conversation view
  - `apps/web/app/(dashboard)/team/page.tsx` - Team management page
  - `apps/web/app/(dashboard)/settings/handoff/page.tsx` - Handoff settings page
- **API Endpoints**:
  - `POST /api/handoff/trigger` - Trigger handoff request
  - `GET /api/handoff/queue` - Get queue for project
  - `POST /api/handoff/claim/:id` - Agent claims conversation
  - `POST /api/handoff/transfer/:id` - Transfer conversation
  - `POST /api/handoff/resolve/:id` - Resolve/close conversation
  - `GET/PUT /api/handoff-settings` - Manage handoff settings
  - `GET/PUT /api/agent/status` - Agent availability status
  - `GET/POST /api/conversations/:id/messages` - Conversation messages
- **Features**:
  - Customer-initiated handoff via button or keyword triggers
  - AI-detected handoff when bot can't answer
  - Agent availability management (online/away/offline)
  - Conversation queue with priority and wait time
  - Direct assignment or queue-based routing
  - Conversation transfer between agents
  - Business hours configuration
  - Real-time messaging infrastructure (Supabase Realtime)
  - Agent inbox with queue and active conversations
  - Team management page
  - Handoff settings with triggers, routing rules, business hours
- **Database Changes**:
  - Tables: `handoff_settings`, `agents`, `agent_invitations`, `conversations` (enhanced)
  - Added handoff-related columns to `chat_sessions`
- **Documentation**:
  - `docs/product/features/human-handoff/HUMAN_AGENT_HANDOFF.md` - Full spec
  - `docs/product/features/human-handoff/AGENT_MANAGEMENT_FLOW.md` - Agent flow
  - `docs/product/features/human-handoff/IMPLEMENTATION_PLAN.md` - Pending enhancements
  - `docs/product/features/human-handoff/TEST_CASES.md` - Test scenarios
- **Pending Enhancements** (documented in IMPLEMENTATION_PLAN.md):
  - Phase 1: Backend real-time broadcast integration
  - Phase 2: Widget real-time connection (replace polling)
  - Phase 3: Dashboard real-time subscriptions
  - Phase 4: Typing indicators
  - Phase 5: Customer presence broadcasting
  - Phase 6: Offline form
- **Notes**: Core handoff functionality complete. Backend is ~95% done. Real-time enhancements planned for future iteration.

---

### #12: url-scraping ✅
- **Started**: 2025-12-19
- **Completed**: 2025-12-19
- **Category**: immediate (promoted from V2)
- **Summary**: Implemented URL scraping to import knowledge from website URLs. Uses Firecrawl API for crawling + GPT-4o-mini for content structuring. Users can enter a URL, see progress, preview content, and import multiple pages as knowledge sources.
- **Key Files**:
  - `apps/api/src/services/firecrawl.ts` - Firecrawl SDK wrapper for website crawling
  - `apps/api/src/services/content-structurer.ts` - LLM-based content structuring (GPT-4o-mini)
  - `apps/api/src/services/scrape-job-manager.ts` - In-memory job management with progress tracking
  - `apps/api/src/routes/knowledge.ts` - Added scrape endpoints (POST, GET, DELETE, import)
  - `apps/web/components/knowledge/url-import-flow.tsx` - Multi-step import UI with progress
  - `apps/web/components/knowledge/add-knowledge-modal.tsx` - Added URL tab
- **API Endpoints**:
  - `POST /api/knowledge/scrape` - Start a website scrape job
  - `GET /api/knowledge/scrape/:jobId` - Get scrape job status (for polling)
  - `POST /api/knowledge/scrape/:jobId/import` - Confirm and import scraped content
  - `DELETE /api/knowledge/scrape/:jobId` - Cancel a scrape job
- **Database Changes**:
  - Migration: `add_url_scraping_columns` - Added source_url and scraped_at columns to knowledge_sources
- **Features**:
  - New "URL" tab in Add Knowledge modal (first position)
  - URL validation with auto https:// prefix
  - Real-time crawling progress display
  - LLM-powered content structuring (removes boilerplate, extracts Q&A pairs)
  - Preview all pages before import with expandable content
  - Page-by-page import with progress tracking
  - One knowledge source per page (better RAG context)
  - Source limit checking (20 max per project)
  - Cancel button during crawl/structuring
  - Success state with "Test in Playground" button
- **Environment Variables** (new):
  - `FIRECRAWL_API_KEY` - Firecrawl API key for website crawling
  - `MAX_CRAWL_PAGES` - Maximum pages to crawl (default: 10)
- **Architecture**:
  - Jobs stored in-memory with 30-minute expiry
  - Background processing for crawl + structure + import
  - Polling-based status updates from frontend
  - Reuses existing RAG pipeline (chunking, context, embedding)
- **Notes**: Requires Firecrawl API key. Content is structured with LLM before import for better RAG retrieval quality.

---

### #11: lead-capture ✅
- **Started**: 2025-12-18
- **Completed**: 2025-12-18
- **Category**: immediate
- **Summary**: Implemented lead capture functionality that offers to collect visitor emails when the chatbot can't answer a question. Includes settings UI, email detection, session state management, lead storage, and daily digest email notifications.
- **Key Files**:
  - `apps/api/src/services/lead-capture.ts` - Lead capture service (email detection, state management, storage)
  - `apps/api/src/services/chat-engine.ts` - Integrated lead capture flow into chat processing
  - `apps/api/src/jobs/lead-digest.ts` - Daily digest email job using Resend
  - `apps/api/src/routes/cron.ts` - Cron endpoints for digest emails
  - `apps/web/app/(dashboard)/settings/page.tsx` - Lead Capture settings UI section
  - `packages/ui/src/components/switch.tsx` - New Switch component
- **API Endpoints**:
  - `POST /api/cron/lead-digest` - Trigger daily lead digest emails (protected by CRON_SECRET)
  - `GET /api/cron/health` - Cron service health check
- **Database Changes**:
  - Migration: `create_lead_captures_table` - Created lead_captures table with indexes and RLS policies
  - Migration: `add_lead_capture_fields_to_sessions` - Added awaiting_email, last_message_at, pending_question, email_asked columns to chat_sessions
- **Features**:
  - Settings page section to enable/disable lead capture
  - Notification email configuration for digest recipients
  - Toggle for email notifications
  - Detects when chatbot can't answer (RAG + response analysis)
  - Offers to collect email conversationally
  - Handles user providing email, declining, or asking different question
  - Session timeout (30 min) resets state
  - Only asks for email once per session
  - Stores leads with or without email for analytics
  - Daily digest emails via Resend with unanswered questions
- **Environment Variables** (new):
  - `RESEND_API_KEY` - For sending digest emails
  - `EMAIL_FROM_ADDRESS` - Sender address for emails
  - `CRON_SECRET` - Authentication for cron endpoints
- **Notes**: Ready for testing. Cron job needs to be configured in production (Vercel Cron or pg_cron).

---

### #10: multiple-projects ✅
- **Started**: 2025-12-18
- **Completed**: 2025-12-18
- **Category**: core
- **Summary**: Implemented multiple projects per account with project switcher dropdown, /projects management page, create project modal, and soft delete functionality. Users can now manage multiple chatbot projects from a single account.
- **Key Files**:
  - `apps/api/src/routes/projects.ts` - Updated with list, create, soft delete, get by ID endpoints
  - `apps/api/src/middleware/auth.ts` - Updated projectAuthMiddleware to require explicit projectId
  - `apps/web/contexts/project-context.tsx` - ProjectContext for state management (page refresh on switch)
  - `apps/web/components/layout/project-switcher.tsx` - Project switcher dropdown
  - `apps/web/components/layout/header.tsx` - Updated header with ProjectSwitcher
  - `apps/web/components/layout/sidebar.tsx` - Added Projects nav link
  - `apps/web/app/(dashboard)/projects/page.tsx` - Projects management page
  - `apps/web/components/projects/create-project-modal.tsx` - Create project modal
  - `apps/web/app/(dashboard)/settings/page.tsx` - Updated for multi-project
  - `apps/web/app/(dashboard)/page.tsx` - Updated dashboard with context
  - `apps/web/app/(dashboard)/analytics/page.tsx` - Updated to use ProjectContext
  - `apps/web/app/(dashboard)/layout.tsx` - Added ProjectProvider wrapper
  - `apps/web/components/knowledge/knowledge-list.tsx` - Passes projectId in API calls
  - `apps/web/components/endpoints/endpoints-list.tsx` - Passes projectId in API calls
  - `packages/ui/src/components/dropdown-menu.tsx` - New dropdown-menu component
- **API Endpoints**:
  - `GET /api/projects` - List all active projects
  - `GET /api/projects/:id` - Get single project by ID
  - `POST /api/projects` - Create new project
  - `PUT /api/projects/:id` - Update project settings
  - `DELETE /api/projects/:id` - Soft delete project
  - `GET /api/projects/:id/onboarding` - Get onboarding progress
- **Database Changes**:
  - Migration: `add_soft_delete_to_projects` - Added `deleted_at` column
  - Index: `idx_projects_user_active` - Efficient filtering of active projects
- **Features**:
  - Project switcher dropdown in header
  - /projects page with project list
  - Create project modal with name and optional system prompt
  - Soft delete (projects marked as deleted, not removed)
  - localStorage persistence for selected project
  - Context automatically switches to another project after delete
  - Dashboard and Settings pages updated to use ProjectContext
  - **Data Isolation** - Each project's data completely isolated (Knowledge, API Endpoints, Analytics)
  - **Page Refresh on Switch** - Clear user feedback when switching projects
- **Data Isolation Bug Fix** (2025-12-18):
  - Fixed `projectAuthMiddleware` to require explicit projectId from client
  - Updated all frontend components to pass projectId in API calls
  - Added page refresh on project switch for clean state
  - Verified with Playwright: Knowledge, API Endpoints, Analytics all properly isolated
- **E2E Testing**: ✅ All features tested with Playwright
  - Project switcher dropdown opens/closes
  - Switching projects triggers page refresh
  - Knowledge page shows only current project's sources
  - API Endpoints page shows only current project's endpoints
  - Analytics page shows only current project's data
  - Creating knowledge in one project doesn't appear in another
- **Notes**: Ready for lead-capture feature

---

### #9: chat-analytics ✅
- **Started**: 2025-12-18
- **Completed**: 2025-12-18
- **Category**: enhanced
- **Summary**: Implemented analytics dashboard showing message/conversation counts with trends, messages over time chart, and top questions clustered by semantic similarity using OpenAI embeddings.
- **Scope**: Must Have items only (ANA-001, ANA-002, ANA-003)
- **Key Files**:
  - `apps/api/src/routes/analytics.ts` - Analytics API routes (summary, top-questions, timeline)
  - `apps/api/src/services/question-clustering.ts` - Question clustering with embeddings and cosine similarity
  - `apps/web/app/(dashboard)/analytics/page.tsx` - Analytics dashboard page with period selector
  - `apps/web/components/analytics/messages-chart.tsx` - Line chart for messages over time
  - `apps/web/components/analytics/top-questions-list.tsx` - Top questions list with clustering
  - `packages/ui/src/components/chart.tsx` - Recharts wrapper components
  - `apps/web/components/layout/sidebar.tsx` - Added Analytics nav link
- **API Routes**:
  - `GET /api/analytics/summary` - Total messages/conversations with trends vs previous period
  - `GET /api/analytics/top-questions` - Top 10 questions clustered by similarity
  - `GET /api/analytics/timeline` - Messages per day for charting
- **Features**:
  - Period selector (24h, 7d, 30d)
  - Stat cards with trend indicators (+/- percentage)
  - Messages over time line chart (using Recharts)
  - Top questions with semantic clustering (0.85 cosine similarity threshold)
  - Similar question examples shown for each cluster
  - Progress bars showing relative frequency
- **Architecture**:
  - Question clustering uses OpenAI embeddings with pgvector
  - Falls back to simple frequency count if embedding fails
  - Trends calculated by comparing current vs previous period
- **Testing**: ✅ Manual testing completed via Playwright browser
  - Analytics page loads with all components
  - Displays 21 messages, 7 conversations
  - Top questions clustered correctly (e.g., 4x "return policy")
  - Period selector renders properly
- **Notes**: Ready for conversation-history feature

---

### #8: mcp-server ✅
- **Started**: 2025-12-18
- **Completed**: 2025-12-18
- **Category**: core
- **Summary**: Implemented MCP (Model Context Protocol) HTTP server that allows AI platforms like Cursor, Claude Code, and Windsurf to programmatically manage chatbots. Users can add the MCP via simple JSON config using their project ID as authentication.
- **Key Files**:
  - `apps/api/src/routes/mcp.ts` - MCP HTTP endpoint with Streamable HTTP transport
  - `apps/api/src/index.ts` - Added MCP route with CORS configuration
  - `apps/web/app/(dashboard)/settings/page.tsx` - Added MCP configuration UI card
- **MCP Endpoint**: `POST/GET/DELETE /mcp`
- **Authentication**: `X-Project-ID` header (project UUID from Settings page)
- **MCP Tools Implemented** (10 tools):
  - `get_project_info` - View project details and statistics
  - `update_project_settings` - Update name, system prompt, welcome message
  - `list_knowledge` - List all knowledge sources
  - `upload_knowledge` - Add text content as knowledge source
  - `delete_knowledge` - Delete a knowledge source
  - `list_api_endpoints` - List configured API endpoints
  - `add_api_endpoint` - Configure new API endpoint with auth
  - `delete_api_endpoint` - Remove API endpoint
  - `get_embed_code` - Get customizable widget embed code
  - `ask_question` - Query chatbot directly (full RAG pipeline)
- **MCP Configuration** (for Cursor/Claude Code):
  ```json
  {
    "chatbot-platform": {
      "type": "http",
      "url": "https://api.yourproduct.com/mcp",
      "headers": {
        "X-Project-ID": "your-project-uuid"
      }
    }
  }
  ```
- **Dashboard UI**: Added MCP Integration card to Settings page with:
  - Copy-able configuration JSON
  - List of available tools with descriptions
  - Tip for how to use with AI assistants
- **Architecture**:
  - Uses `@modelcontextprotocol/sdk` v1.25.1
  - Streamable HTTP transport (latest MCP spec 2025-06-18)
  - Session management with UUID session IDs
  - Reuses existing services: RAG pipeline, encryption, chat-engine
- **Testing**: ✅ Manual API testing completed
  - Initialize session: Returns valid session ID
  - tools/list: Returns all 10 tools with schemas
  - get_project_info: Returns project details
  - list_knowledge: Returns knowledge sources
  - get_embed_code: Returns customized widget code
  - ask_question: Full RAG retrieval with sources
- **Notes**: Ready for production. Users can now manage their chatbot entirely from AI coding assistants.

---

### #7: widget ✅
- **Started**: 2025-12-18
- **Completed**: 2025-12-18
- **Category**: core
- **Summary**: Built a production-quality embeddable chat widget that users can add to their websites via a single script tag. Uses Shadow DOM for complete style isolation, works on any website without conflicts. Includes an interactive dashboard embed page with live preview and real-time customization.
- **Key Files**:
  - `apps/widget/src/widget.ts` - Main entry point with auto-initialization from script attributes
  - `apps/widget/src/components/bubble.ts` - Floating chat button with animated icon toggle
  - `apps/widget/src/components/chat-window.ts` - Chat interface with messages, typing indicator, focus trap
  - `apps/widget/src/components/message.ts` - Message bubble with XSS-safe rendering
  - `apps/widget/src/components/input.ts` - Auto-resizing textarea with character count
  - `apps/widget/src/components/typing-indicator.ts` - Animated three-dot typing indicator
  - `apps/widget/src/utils/api.ts` - API client with rate limit and error handling
  - `apps/widget/src/utils/storage.ts` - Visitor ID, session, and message persistence
  - `apps/widget/src/utils/helpers.ts` - DOM helpers, ID generation, XSS escaping
  - `apps/widget/src/styles/widget.css` - Production CSS with mobile support
  - `apps/widget/build.ts` - esbuild config with CSS inlining
  - `apps/widget/test.html` - Local testing page
  - `apps/widget/upload-to-supabase.ts` - Script to upload widget to Supabase Storage
  - `apps/widget/README.md` - Widget documentation with deployment instructions
  - `apps/web/app/(dashboard)/embed/page.tsx` - Interactive embed page with live preview & customization
  - `apps/api/src/routes/projects.ts` - Projects API endpoint (GET/PUT/DELETE)
- **Hosting**: Widget hosted on Supabase Storage at public URL
  - URL: `https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js`
  - Storage bucket: `assets` (public read access)
  - Re-upload script: `npx tsx upload-to-supabase.ts`
- **Bundle Size**: ~32KB unminified, **~8KB gzipped** (well under 30KB target)
- **Widget Features**:
  - Single script tag embed: `<script src="widget.js" data-project-id="xxx">`
  - Shadow DOM for complete CSS isolation
  - Customizable: position, primary color, title, greeting
  - Session persistence (messages restored on page refresh)
  - Visitor ID persistence (across browser sessions)
  - Typing indicator with animated dots
  - Mobile responsive (fullscreen on small screens)
  - Accessibility: keyboard navigation, focus trap, ARIA labels, Escape to close
  - Rate limit handling with user-friendly messages
  - XSS-safe message rendering
  - Auto-resizing textarea with character counter
  - Reduced motion support
  - High contrast mode support
- **Dashboard Embed Page**:
  - **Live Preview**: Loads the REAL widget with user's project ID and knowledge base
  - **Interactive Customization Panel**:
    - Position dropdown (bottom-right / bottom-left)
    - Color picker with hex input
    - Chat title text input
    - Greeting message textarea
    - Reset to defaults button
  - **Real-time Updates**: Preview refreshes instantly when customization changes
  - **Dynamic Embed Code**: Code updates automatically with all custom settings
  - Copy code button with feedback
  - Desktop/mobile preview toggle
  - Integration guides section (HTML available, WordPress/Shopify/React coming soon)
- **Backend Updates**:
  - Added `/api/projects` endpoint for project data (replaces direct Supabase calls)
  - Selective CORS: open for widget (`/api/chat/*`), restricted for dashboard
  - Updated Settings, Playground, and Embed pages to use API consistently
- **Architecture**:
  - Pure TypeScript/JavaScript (no framework)
  - Shadow DOM for style isolation
  - esbuild for bundling (CSS inlined at build time)
  - Modular component architecture
  - Widget script hosted on Supabase Storage
- **Notes**: Fully deployed and ready for production use. Users can customize their widget, preview it live with their actual knowledge base, and copy the embed code.

---

### #6: chat-engine ✅
- **Started**: 2025-12-17
- **Completed**: 2025-12-17
- **Category**: core
- **Summary**: Implemented the RAG-based chat engine that orchestrates knowledge retrieval via vector similarity search, API tool calling, and LLM response generation using GPT-4o-mini. This is the backbone of the entire chatbot system.
- **Key Files**:
  - `apps/api/src/services/chat-engine.ts` - Main orchestrator (processChat, callLLMWithTools, session management)
  - `apps/api/src/services/rag-retrieval.ts` - Vector search over knowledge base using pgvector
  - `apps/api/src/services/prompt-builder.ts` - System prompt construction with context injection
  - `apps/api/src/routes/chat.ts` - Full chat API routes (message, conversations, rate-limit-status, health)
  - `apps/api/src/middleware/rate-limit.ts` - Tiered rate limiting (per-minute/hour/day)
  - `apps/web/app/(dashboard)/playground/page.tsx` - Chat playground page
  - `apps/web/components/chat/chat-message.tsx` - Message display with sources and tool calls
  - `apps/web/components/chat/chat-input.tsx` - Auto-resizing input with character counter
  - `packages/ui/src/components/scroll-area.tsx` - Radix ScrollArea component
  - `packages/ui/src/components/avatar.tsx` - Radix Avatar component
  - `packages/ui/src/components/tooltip.tsx` - Radix Tooltip component
- **API Routes**:
  - `POST /api/chat/message` - Send message (with RAG retrieval and tool calling)
  - `GET /api/chat/conversations/:id` - Get conversation by session ID
  - `GET /api/chat/conversations` - List all conversations for project
  - `GET /api/chat/rate-limit-status` - Get rate limit status for visitor
  - `GET /api/chat/health` - Health check endpoint
- **Architecture**:
  - RAG Pipeline: Query → Embed → pgvector search → Context formatting → LLM
  - Tool Calling: OpenAI function format → Execute API endpoints → Return results to LLM
  - Tiered Rate Limits: 15/min, 100/hour, 500/day per visitor
  - LLM: GPT-4o-mini with 30s timeout, max 800 tokens, temperature 0.7
  - Similarity threshold: 0.3 (tuned for small knowledge bases)
  - Max 3 tool call iterations to prevent infinite loops
- **Features**:
  - Semantic search over knowledge base with pgvector
  - Dynamic context injection from retrieved chunks
  - Source attribution in responses (relevance scores)
  - API tool calling during conversation
  - Session tracking and conversation history
  - Graceful error handling with fallback responses
  - Processing time and token usage tracking
  - Beautiful playground UI with real-time typing indicator
  - Suggestion buttons for quick testing
  - Source and tool call visualization
- **Testing**: ✅ Manual API testing completed
  - Return policy question: Retrieved FAQs source (55% relevance)
  - Customer support question: Retrieved Contact source (43% relevance)
  - Irrelevant question: Appropriate "I don't know" response
  - Rate limit status: Correctly tracks per-visitor limits
- **Notes**: Ready for widget feature (embeddable chat)

---

### #5: api-endpoints ✅
- **Started**: 2025-12-17
- **Completed**: 2025-12-17
- **Category**: core
- **Summary**: Implemented API endpoint configuration allowing users to connect external APIs (like order status, inventory lookup) that the chatbot can call as tools. Includes encrypted credential storage and endpoint testing.
- **Key Files**:
  - `apps/api/src/routes/endpoints.ts` - Express API routes (GET, POST, PUT, DELETE, POST /:id/test)
  - `apps/api/src/services/encryption.ts` - AES-256-GCM encryption for API credentials
  - `apps/api/src/services/tool-executor.ts` - Convert endpoints to OpenAI tools, execute tool calls
  - `apps/web/app/(dashboard)/api-endpoints/page.tsx` - Dashboard API endpoints page
  - `apps/web/components/endpoints/endpoints-list.tsx` - Endpoint list with test/edit/delete actions
  - `apps/web/components/endpoints/add-endpoint-modal.tsx` - Modal for add/edit endpoints
  - `packages/ui/src/components/select.tsx` - New Select component for dropdowns
- **API Routes**:
  - `GET /api/endpoints` - List all endpoints for project
  - `POST /api/endpoints` - Create new endpoint (with encrypted auth)
  - `GET /api/endpoints/:id` - Get single endpoint (without credentials)
  - `PUT /api/endpoints/:id` - Update endpoint
  - `DELETE /api/endpoints/:id` - Delete endpoint
  - `POST /api/endpoints/:id/test` - Test endpoint connection
- **Features**:
  - Add endpoints with name, description, URL (with {placeholder} syntax), method (GET/POST)
  - Authentication: None, API Key (custom header), Bearer Token
  - Credentials encrypted at rest using AES-256-GCM
  - Test endpoint button to validate configuration
  - Edit and delete endpoints
  - 10 endpoints per project limit
  - Tool conversion for chat engine (OpenAI function format)
- **Environment**:
  - Added `ENCRYPTION_KEY` to `.env.example` and `.env`
  - Key generation: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **E2E Testing**: ✅ All features tested with Playwright (add, edit, delete, test for all auth types)
- **Notes**: Ready for chat-engine feature (tool calling)

---

### #4: knowledge-base ✅
- **Started**: 2025-12-17
- **Completed**: 2025-12-17
- **Updated**: 2025-12-17 (added view/download features)
- **Category**: core
- **Summary**: Implemented knowledge base management allowing users to upload and manage knowledge sources (text, .txt files, .pdf files). Content is processed through a pipeline: text extraction, chunking (~500 tokens with overlap), embedding generation via OpenAI, and vector storage in pgvector.
- **Key Files**:
  - `apps/api/src/routes/knowledge.ts` - Express API routes (GET, POST, POST /upload, DELETE, GET /:id, GET /:id/download)
  - `apps/api/src/middleware/auth.ts` - Auth middleware with Supabase token validation
  - `apps/api/src/services/chunking.ts` - Text chunking service
  - `apps/api/src/services/embedding.ts` - Embedding generation service
  - `apps/web/lib/api-client.ts` - Frontend API client utility
  - `apps/web/app/(dashboard)/knowledge/page.tsx` - Dashboard knowledge page
  - `apps/web/components/knowledge/knowledge-list.tsx` - Source list with realtime status and view buttons
  - `apps/web/components/knowledge/add-knowledge-modal.tsx` - Modal with tabs for text/file/pdf
  - `apps/web/components/knowledge/view-knowledge-modal.tsx` - Modal for viewing text content or downloading files
  - `packages/ui/src/components/tabs.tsx` - New Tabs component
  - `packages/ui/src/components/label.tsx` - New Label component
- **Database Changes**:
  - Created `knowledge-files` storage bucket with 10MB limit
  - RLS policies for user-scoped file access
  - Service role policy for background processing
- **Architecture**:
  - All API logic in `apps/api` (Express backend)
  - Frontend (`apps/web`) calls backend via `api-client.ts`
  - Updated `docs/product/architecture/system-overview.md` with architecture principles
- **Features**:
  - Upload text content directly (paste)
  - Upload .txt files (drag & drop or browse)
  - Upload .pdf files with text extraction
  - Realtime status updates (processing/ready/failed)
  - Delete sources with cascade to chunks and storage
  - View text content in modal (KB-014)
  - Download uploaded files via signed URL (KB-015)
  - 20 source limit per project
  - 10MB file size limit
- **E2E Testing**: ✅ All features tested with Playwright
- **Notes**: Ready for chat-engine feature (RAG retrieval)

---

### #3: auth-system ✅
- **Started**: 2025-12-17
- **Completed**: 2025-12-17
- **Updated**: 2025-12-17 (bug fixes for PKCE flow and race conditions)
- **Category**: infrastructure
- **Summary**: Implemented magic link authentication using Supabase Auth with automatic project creation for new users. Includes functional Settings page for project management.
- **Key Files**:
  - `apps/web/lib/supabase/client.ts` - Browser Supabase client
  - `apps/web/lib/supabase/server.ts` - Server-side Supabase client with cookie handling
  - `apps/web/lib/supabase/middleware.ts` - Route protection middleware helper
  - `apps/web/middleware.ts` - Next.js middleware entry point
  - `apps/web/app/(auth)/login/page.tsx` - Magic link login form with validation
  - `apps/web/app/(auth)/login/check-email/page.tsx` - Email confirmation page with resend
  - `apps/web/app/(auth)/auth/callback/page.tsx` - Auth callback with PKCE support and project auto-creation
  - `apps/web/components/layout/header.tsx` - User menu with logout functionality
  - `apps/web/app/(dashboard)/layout.tsx` - Dynamic dashboard layout (force-dynamic)
  - `apps/web/app/(dashboard)/settings/page.tsx` - Project settings page (name, system prompt, delete)
- **Auth Flow**:
  - User enters email on login page
  - Supabase sends magic link via email (PKCE flow)
  - User clicks link -> callback exchanges code for session
  - New users get a default "My Chatbot" project auto-created
  - Middleware protects dashboard routes, redirects to login if needed
  - Header shows user email and logout button
- **Settings Page Features** (part of project management):
  - Load and display project name and system prompt
  - Save project name and system prompt changes
  - Copy project ID to clipboard
  - Delete project with confirmation (signs out user)
- **Bug Fixes Applied**:
  - Fixed PKCE code exchange flow (was using wrong callback route type)
  - Fixed race condition in project auto-creation (used `.limit(1)` instead of `.single()`)
  - Fixed header showing user info (used `.limit(1)` for project query)
- **Database Changes**: Uses existing `projects` table from database-setup
- **E2E Testing**: ✅ Auth flow tested with Playwright (Settings page needs testing)
- **Notes**: Ready for knowledge-base and api-endpoints features

---

### #2: database-setup ✅
- **Started**: 2025-12-17
- **Completed**: 2025-12-17
- **Category**: infrastructure
- **Summary**: Set up Supabase PostgreSQL database with all required tables, pgvector extension for embeddings, RLS policies, and database functions. Created TypeScript types and query helpers.
- **Key Files**:
  - `packages/db/src/types.ts` - Auto-generated TypeScript types from Supabase schema
  - `packages/db/src/client.ts` - Typed Supabase client (browser + admin)
  - `packages/db/src/queries/projects.ts` - Project CRUD operations
  - `packages/db/src/queries/knowledge.ts` - Knowledge sources and chunks with vector search
  - `packages/db/src/queries/endpoints.ts` - API endpoint CRUD operations
  - `packages/db/src/queries/chat.ts` - Chat session management
  - `packages/db/src/index.ts` - Package exports
- **Database Changes**:
  - 7 migrations applied to Supabase project (hynaqwwofkpaafvlckdm)
  - Tables: `projects`, `knowledge_sources`, `knowledge_chunks`, `api_endpoints`, `chat_sessions`, `api_keys`
  - Extensions: pgvector enabled
  - Functions: `match_knowledge_chunks`, `get_user_by_api_key`, `update_updated_at_column`, `update_source_chunk_count`
  - RLS enabled on all tables with user isolation policies
  - Service role policies for backend operations
- **Notes**: Ready for auth-system feature

---

### #1: project-scaffolding ✅
- **Started**: 2025-12-17
- **Completed**: 2025-12-17
- **Category**: infrastructure
- **Summary**: Set up Turborepo monorepo with all apps (web, api, widget, mcp-server) and shared packages (ui, db, shared, configs)
- **Key Files**:
  - `apps/web/` - Next.js 14 dashboard app with shadcn styling
  - `apps/api/` - Express API server with routes and services
  - `apps/widget/` - Embeddable chat widget with esbuild
  - `apps/mcp-server/` - MCP server for AI platforms
  - `packages/ui/` - shadcn UI components
  - `packages/db/` - Supabase client and type definitions
  - `packages/shared/` - Shared utilities and constants
  - `packages/typescript-config/` - Shared TypeScript configs
  - `packages/eslint-config/` - Shared ESLint configs
- **Database Changes**: None (infrastructure only)
- **Notes**: Ready for database-setup feature

---

## Next Up

### Immediate Priority
All immediate priority features have been completed! 🎉

### Recently Completed
1. **#14: message-analytics** - Contextual metadata with messages ✅
   - Spec: [message-analytics/spec.md](./message-analytics/spec.md)
   - Captures: browser, OS, device type, page URL, geolocation

### Planned Features - Ready for Implementation
1. **#15: quick-questions** - Suggested conversation starters
   - Spec: [quick-questions/spec.md](./quick-questions/spec.md)
   - Dependencies: widget ✅, chat-analytics ✅
   - Summary: Clickable question suggestions near chat bubble and in chat window

2. **#16: micro-surveys** - Delightful feedback collection
   - Spec: [micro-surveys/spec.md](./micro-surveys/spec.md)
   - Dependencies: widget ✅
   - Summary: Floating popup surveys with illustrated mood shapes

3. **#17: smart-lead-capture** - Contextual email collection
   - Spec: [lead-capture/spec.md](./lead-capture/spec.md)
   - Dependencies: lead-capture ✅, widget ✅
   - Summary: Smart in-chat email capture (NOT pre-chat gates)

### Enhanced (V2) - Next in Queue
1. **#18: conversation-history** - View and search past conversations
   - Spec: [conversation-history/spec.md](./enhanced/conversation-history/spec.md)
   - Dependencies: chat-engine ✅

2. **#19: widget-customization** - Colors, position, branding
   - Spec: [widget-customization/spec.md](./enhanced/widget-customization/spec.md)
   - Dependencies: widget ✅

3. **#20: docx-support** - Support for .doc/.docx files
   - Spec: [docx-support/spec.md](./enhanced/docx-support/spec.md)
   - Dependencies: knowledge-base ✅
