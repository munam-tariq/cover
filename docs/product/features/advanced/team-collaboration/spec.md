# Team Collaboration Feature Specification

## Metadata
- **Feature ID**: ADV-002
- **Feature Name**: Team Collaboration
- **Category**: Advanced
- **Priority**: P2
- **Complexity**: High
- **Target Version**: V3
- **Dependencies**: Multiple Chatbots (ADV-001), User authentication, RBAC system
- **Owner**: Product Team
- **Status**: Planned

## Summary
Enable users to invite team members to collaborate on chatbot projects with role-based access control. Team members can view conversations, manage knowledge bases, and configure settings based on their assigned role. This feature enables organizations to distribute chatbot management across multiple team members while maintaining security and audit trails.

## User Story
As a Cover account owner, I want to invite team members to collaborate on my chatbot projects so that my team can share the workload of managing conversations, knowledge bases, and configurations without sharing login credentials.

## Functional Requirements

### FR-001: Team Member Invitation
- Account owners can invite users via email address
- Invitations include role selection (Admin, Editor, Viewer, Agent)
- Invited users receive email with acceptance link
- Invitation links expire after 7 days
- Pending invitations can be resent or revoked

### FR-002: Role-Based Access Control
- **Owner**: Full access, billing, team management, cannot be removed
- **Admin**: Full project access, can invite/remove members (except Owner)
- **Editor**: Can modify knowledge base, settings, view conversations
- **Agent**: Can view and respond to conversations only
- **Viewer**: Read-only access to conversations and analytics

### FR-003: Team Member Management
- Dashboard shows all team members with their roles
- Owners and Admins can change member roles
- Owners and Admins can remove team members
- Members can leave team voluntarily (except Owner)
- System tracks member activity (last login, actions performed)

### FR-004: Project-Level Access
- Team members can be assigned to specific projects or all projects
- Project access is managed independently from global team access
- Members only see projects they have access to
- Project selector shows only accessible projects

### FR-005: Collaboration Features
- Activity feed shows team member actions (who edited what, when)
- Internal notes on conversations visible to all team members
- @mentions in notes to notify specific team members
- Assignment of conversations to specific team members

### FR-006: Audit Trail
- Complete audit log of team member actions
- Track changes to knowledge base, settings, conversations
- Log member invitations, role changes, and removals
- Exportable audit logs (CSV format)

### FR-007: Team Limits
- Team size limits based on subscription tier (Pro: 5 members, Enterprise: Unlimited)
- Clear messaging when team limit is reached
- Upgrade prompts when attempting to exceed limits

### FR-008: Email Notifications
- Notify team members of @mentions
- Daily digest of project activity (optional)
- Alerts for critical events (chatbot down, quota exceeded)
- Customizable notification preferences per member

## UI Mockup

```
+----------------------------------------------------------+
|  Team Settings                                            |
+----------------------------------------------------------+
|                                                           |
|  Team Members (4/5)                    [+ Invite Member]  |
|                                                           |
|  +----------------------------------------------------+   |
|  | Name           Email              Role      Actions |   |
|  |----------------------------------------------------|   |
|  | John Doe       john@co.com       Owner     -       |   |
|  | (You)                                              |   |
|  |----------------------------------------------------|   |
|  | Jane Smith     jane@co.com       Admin     [Edit]  |   |
|  |                                             [Remove]|   |
|  |----------------------------------------------------|   |
|  | Bob Johnson    bob@co.com        Editor    [Edit]  |   |
|  | Last active: 2h ago                         [Remove]|   |
|  |----------------------------------------------------|   |
|  | Alice Wong     alice@co.com      Viewer    [Edit]  |   |
|  | Pending invitation                          [Resend]|   |
|  +----------------------------------------------------+   |
|                                                           |
|  Pending Invitations (1)                                  |
|  - alice@co.com (Viewer) - Sent 2 days ago [Revoke]      |
|                                                           |
+----------------------------------------------------------+

Invite Member Modal:
+----------------------------------+
| Invite Team Member               |
|----------------------------------|
| Email:                           |
| [alice@company.com]              |
|                                  |
| Role:                            |
| [Admin v]                        |
|                                  |
| Projects:                        |
| [ ] All Projects                 |
| [x] Support Bot                  |
| [ ] Sales Assistant              |
|                                  |
| Message (optional):              |
| [________________________]       |
|                                  |
|        [Cancel]  [Send Invite]   |
+----------------------------------+

Activity Feed:
+----------------------------------+
| Recent Team Activity             |
|----------------------------------|
| Jane Smith added 3 documents     |
| to Support Bot                   |
| 2 hours ago                      |
|----------------------------------|
| Bob Johnson responded to         |
| conversation #1234               |
| 4 hours ago                      |
|----------------------------------|
| John Doe changed widget theme    |
| in Sales Assistant               |
| 1 day ago                        |
+----------------------------------+
```

## Technical Approach

### Data Model
```typescript
interface TeamMember {
  id: string;
  userId: string;
  accountId: string;
  role: 'owner' | 'admin' | 'editor' | 'agent' | 'viewer';
  projectAccess: 'all' | string[]; // 'all' or array of project IDs
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date;
  lastActiveAt?: Date;
  status: 'pending' | 'active' | 'suspended';
}

interface TeamInvitation {
  id: string;
  accountId: string;
  email: string;
  role: string;
  projectAccess: 'all' | string[];
  token: string;
  invitedBy: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

interface AuditLog {
  id: string;
  accountId: string;
  projectId?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}
```

### Permission Matrix
```
Action                  | Owner | Admin | Editor | Agent | Viewer
------------------------|-------|-------|--------|-------|--------
Manage billing          |   ✓   |   ✗   |   ✗    |   ✗   |   ✗
Invite members          |   ✓   |   ✓   |   ✗    |   ✗   |   ✗
Remove members          |   ✓   |   ✓   |   ✗    |   ✗   |   ✗
Create projects         |   ✓   |   ✓   |   ✗    |   ✗   |   ✗
Delete projects         |   ✓   |   ✓   |   ✗    |   ✗   |   ✗
Modify settings         |   ✓   |   ✓   |   ✓    |   ✗   |   ✗
Manage knowledge base   |   ✓   |   ✓   |   ✓    |   ✗   |   ✗
View conversations      |   ✓   |   ✓   |   ✓    |   ✓   |   ✓
Respond to conversations|   ✓   |   ✓   |   ✓    |   ✓   |   ✗
View analytics          |   ✓   |   ✓   |   ✓    |   ✓   |   ✓
Export data             |   ✓   |   ✓   |   ✗    |   ✗   |   ✗
```

### Database Schema
- Create `team_members` table with user and role information
- Create `team_invitations` table for pending invites
- Create `audit_logs` table for activity tracking
- Add `account_id` to projects for multi-tenant support
- Add indexes on `account_id`, `user_id`, and `project_id`

### API Endpoints
```
POST   /api/team/invite              - Send invitation
GET    /api/team/members             - List team members
PATCH  /api/team/members/:id         - Update member role
DELETE /api/team/members/:id         - Remove member
POST   /api/team/invitations/:token  - Accept invitation
DELETE /api/team/invitations/:id     - Revoke invitation
GET    /api/team/audit-logs          - Get audit logs
GET    /api/team/activity            - Get activity feed
```

### Authentication & Authorization
- JWT tokens include team context (accountId, role, projectAccess)
- Middleware validates permissions on each request
- Redis cache for permission checks to minimize database queries
- Session tracking per team member

### Email System
- Invitation emails with branded templates
- Mention notifications with conversation context
- Daily activity digest compilation
- Email delivery via SendGrid/AWS SES

## Acceptance Criteria

### AC-001: Invitation Flow
- Given I am an Owner, when I invite a user by email, they receive an invitation email
- Invitation email contains accept link and project information
- When recipient clicks link, they can create account or log in
- After accepting, they have access to assigned projects with correct role

### AC-002: Role Permissions
- Given I am a Viewer, I can view conversations but cannot edit knowledge base
- Given I am an Editor, I can modify knowledge base and settings
- Given I am an Agent, I can respond to conversations but not change settings
- Given I am an Admin, I can invite new members and manage projects

### AC-003: Member Management
- Given I am an Owner, I can change any member's role except my own
- Given I am an Admin, I can remove Editors, Agents, and Viewers but not Owner
- When a member is removed, they immediately lose access
- Members can voluntarily leave the team (except Owner)

### AC-004: Project Access Control
- Given a member has access to specific projects, they only see those projects
- Given a member has "all projects" access, they see all current and future projects
- Project access can be modified without changing role
- Members cannot access projects they are not assigned to

### AC-005: Audit Trail
- All team member actions are logged with timestamp and user
- Audit logs are searchable and filterable
- Logs can be exported as CSV
- Sensitive actions (deletions, member removal) are prominently logged

### AC-006: Team Limits
- Given my Pro plan (5 members), I cannot invite a 6th member
- System shows clear error message when limit is reached
- Upgrade link is provided when attempting to exceed limit
- Removing a member allows inviting a new one

### AC-007: Notifications
- Given a team member @mentions me, I receive an email notification
- Given I enable daily digest, I receive activity summary email
- Notification preferences are customizable per member
- Unsubscribe link is included in all emails

## Out of Scope (V4+)
- Granular permissions (custom roles)
- Team-level billing splits
- Guest access (temporary, limited access)
- Integration with SSO/SAML
- Team chat or messaging
- Advanced workflow automation

## Success Metrics
- Percentage of Pro/Enterprise accounts adding team members
- Average team size per account
- Team member engagement rate (active members / total members)
- Time saved on support tickets related to access sharing

## Questions & Decisions
- **Q**: Should we support SSO for team authentication?
  - **A**: V4 feature, SAML/SSO for Enterprise tier only

- **Q**: Maximum invitation expiry time?
  - **A**: 7 days, can be manually resent

- **Q**: Should removed members retain access to conversation history?
  - **A**: No, immediate access revocation

## References
- [Multiple Chatbots Feature](/docs/product/features/advanced/multiple-chatbots/spec.md)
- [Roadmap: V3 Advanced Features](/docs/product/roadmap.md)
- [RBAC Architecture](/docs/technical/architecture/rbac.md)
