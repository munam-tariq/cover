# White Label Feature Specification

## Metadata
- **Feature ID**: ADV-006
- **Feature Name**: White Label
- **Category**: Advanced
- **Priority**: P2
- **Complexity**: Medium
- **Target Version**: V3
- **Dependencies**: Widget customization, Email templates, Dashboard theming
- **Owner**: Product Team
- **Status**: Planned

## Summary
Enable Enterprise customers to completely rebrand Cover with their own logo, colors, domain, and remove all Cover branding from the widget, dashboard, and customer-facing elements. This feature allows agencies and SaaS companies to resell Cover as their own product or seamlessly integrate it into their brand ecosystem without visible Cover attribution.

## User Story
As an Enterprise customer or agency, I want to remove all Cover branding and replace it with my own brand so that my customers perceive the chatbot as my native product, strengthening my brand identity and enabling white-label resale opportunities.

## Functional Requirements

### FR-001: Widget White Labeling
- Remove "Powered by Cover" footer from chatbot widget
- Custom logo in widget header (replaces Cover logo)
- Fully customizable colors, fonts, and styling
- Custom "Offline" and "Away" messages without Cover branding
- Option to remove or customize launcher icon

### FR-002: Dashboard Branding
- Replace Cover logo in dashboard navigation with custom logo
- Custom brand colors for dashboard theme
- Custom favicon for dashboard
- Option to hide "Powered by Cover" in footer
- Custom product name throughout interface (e.g., "My Chatbot" instead of "Cover")

### FR-003: Custom Domain
- Host dashboard on custom subdomain (e.g., chatbot.company.com)
- SSL certificate management for custom domain
- Automatic HTTPS redirect
- Widget API served from custom domain
- Email links point to custom domain

### FR-004: Email Customization
- Remove Cover branding from all customer-facing emails
- Custom email templates with agency/company branding
- Custom sender name and email address (e.g., support@company.com)
- Custom email footer with company information
- Template editor for transactional emails

### FR-005: Legal & Documentation
- Option to use custom Terms of Service and Privacy Policy
- Custom "About" section in widget
- Custom help documentation links
- White-label API documentation
- Remove references to Cover in user-facing text

### FR-006: Reseller Features
- Create sub-accounts for reseller customers
- Reseller admin dashboard with multi-tenant management
- Billing passthrough or reseller markup configuration
- Usage reporting per sub-account
- Isolated branding per sub-account

### FR-007: Asset Management
- Upload and manage multiple logo variants (light, dark, icon-only)
- Logo dimensions and format validation (PNG, SVG, max 2MB)
- Preview logos across all touchpoints before applying
- Logo history and rollback functionality
- Brand asset library (logos, colors, fonts)

### FR-008: Compliance & Attribution
- Terms require maintaining Cover attribution in backend/API responses
- Analytics and logging still reference Cover internally
- License verification ensures white-label is Enterprise-only
- Audit log tracks white-label configuration changes

## UI Mockup

```
White Label Settings:
+----------------------------------------------------------+
|  White Label Configuration                [Enterprise]   |
+----------------------------------------------------------+
|                                                           |
|  Widget Branding                                          |
|  +------------------------------------------------------+|
|  | [x] Remove "Powered by Cover" branding               ||
|  |                                                      ||
|  | Company Logo:                                        ||
|  | [Upload Logo] [Preview]                              ||
|  | Current: [acme-logo.png] 245 KB                      ||
|  | Recommended: PNG or SVG, max 2MB, 200x50px           ||
|  |                                                      ||
|  | Custom Product Name:                                 ||
|  | [ACME Support Assistant_____________]                ||
|  | This replaces "Cover" throughout the interface       ||
|  |                                                      ||
|  | Preview:                                             ||
|  | +------------------------------------------+         ||
|  | | [ACME Logo]  Chat with us     [x]        |         ||
|  | |------------------------------------------|         ||
|  | | Hello! How can I help?                   |         ||
|  | |                                          |         ||
|  | | [Type your message...]         [Send]    |         ||
|  | +------------------------------------------+         ||
|  +------------------------------------------------------+|
|                                                           |
|  Dashboard Branding                                       |
|  +------------------------------------------------------+|
|  | Dashboard Logo:                                      ||
|  | [Upload Logo] [Preview]                              ||
|  | Current: [acme-logo-dark.png] 189 KB                 ||
|  |                                                      ||
|  | Brand Colors:                                        ||
|  | Primary:   [#3B82F6] [Color Picker]                  ||
|  | Secondary: [#10B981] [Color Picker]                  ||
|  | Accent:    [#F59E0B] [Color Picker]                  ||
|  |                                                      ||
|  | Favicon:                                             ||
|  | [Upload] [Preview] [acme-favicon.ico] 32 KB          ||
|  +------------------------------------------------------+|
|                                                           |
|  Custom Domain                                            |
|  +------------------------------------------------------+|
|  | Dashboard Domain:                                    ||
|  | [chatbot.acme.com_________________]                  ||
|  | DNS Configuration: [View Instructions]               ||
|  | Status: [✓ Verified] SSL: [✓ Active]                 ||
|  |                                                      ||
|  | Widget API Domain:                                   ||
|  | [api.chatbot.acme.com_____________]                  ||
|  | Status: [⏳ Pending Verification]                    ||
|  +------------------------------------------------------+|
|                                                           |
|  Email Customization                                      |
|  +------------------------------------------------------+|
|  | Sender Name: [ACME Support________]                  ||
|  | Sender Email: [support@acme.com___]                  ||
|  | [Configure DNS Records for Email Delivery]           ||
|  |                                                      ||
|  | Email Templates:                                     ||
|  | - Welcome Email              [Edit]                  ||
|  | - Password Reset             [Edit]                  ||
|  | - Team Invitation            [Edit]                  ||
|  | - Escalation Notification    [Edit]                  ||
|  +------------------------------------------------------+|
|                                                           |
|  Legal & Compliance                                       |
|  +------------------------------------------------------+|
|  | Terms of Service URL:                                ||
|  | [https://acme.com/terms_______]                      ||
|  |                                                      ||
|  | Privacy Policy URL:                                  ||
|  | [https://acme.com/privacy_____]                      ||
|  |                                                      ||
|  | Custom Help Documentation:                           ||
|  | [https://help.acme.com________]                      ||
|  +------------------------------------------------------+|
|                                                           |
|                               [Cancel]  [Save Changes]    |
+----------------------------------------------------------+

Reseller Dashboard:
+----------------------------------------------------------+
|  Reseller Management                                      |
+----------------------------------------------------------+
|                                                           |
|  Sub-Accounts (23)                    [+ Create Account]  |
|                                                           |
|  +------------------------------------------------------+|
|  | Account         | Plan       | Usage      | MRR      ||
|  |----------------------------------------------------- ||
|  | ACME Corp       | Enterprise | 12K/50K    | $499     ||
|  | Beta Inc        | Pro        | 3K/10K     | $149     ||
|  | Gamma LLC       | Pro        | 7K/10K     | $149     ||
|  +------------------------------------------------------+|
|                                                           |
|  Total MRR: $2,847 | Commission (20%): $569               |
+----------------------------------------------------------+
```

## Technical Approach

### Data Model
```typescript
interface WhiteLabelConfig {
  id: string;
  projectId: string;
  accountId: string;

  // Widget branding
  widgetLogo?: string; // S3 URL
  widgetRemoveBranding: boolean;
  productName: string;

  // Dashboard branding
  dashboardLogo?: string;
  dashboardLogoDark?: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  favicon?: string;

  // Custom domain
  customDomain?: string;
  customDomainVerified: boolean;
  apiDomain?: string;
  sslCertificateStatus: 'pending' | 'active' | 'failed';

  // Email customization
  emailSenderName: string;
  emailSenderAddress: string;
  emailTemplates: Record<string, string>; // Template overrides

  // Legal
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  helpDocumentationUrl?: string;

  // Reseller config
  isReseller: boolean;
  resellerMarkup?: number; // Percentage markup

  createdAt: Date;
  updatedAt: Date;
}

interface ResellerAccount {
  id: string;
  resellerId: string; // Parent account ID
  name: string;
  domain: string;
  plan: string;
  billingPassthrough: boolean;
  customWhiteLabel: boolean; // Allow sub-account custom branding
  createdAt: Date;
}
```

### Asset Storage
```typescript
// S3/CloudFront for logo and asset hosting
const ALLOWED_FORMATS = ['image/png', 'image/svg+xml', 'image/jpeg'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

async function uploadLogo(file: File, type: 'widget' | 'dashboard'): Promise<string> {
  validateFileFormat(file, ALLOWED_FORMATS);
  validateFileSize(file, MAX_FILE_SIZE);

  const optimizedImage = await optimizeImage(file);
  const s3Key = `white-label/${accountId}/${type}-logo-${Date.now()}.${ext}`;

  await s3.upload(s3Key, optimizedImage);
  await invalidateCDNCache(`/assets/${s3Key}`);

  return `https://cdn.cover.com/assets/${s3Key}`;
}
```

### Custom Domain Setup
```typescript
// DNS verification process
async function verifyCustomDomain(domain: string): Promise<boolean> {
  // Check for required DNS records
  const txtRecord = await dns.resolveTxt(domain);
  const expectedToken = await generateVerificationToken(domain);

  return txtRecord.includes(`cover-verify=${expectedToken}`);
}

// SSL certificate provisioning via Let's Encrypt
async function provisionSSL(domain: string): Promise<void> {
  const certificate = await acme.requestCertificate(domain);
  await cloudfront.updateSSLCertificate(domain, certificate);
  await updateWhiteLabelConfig(domain, { sslCertificateStatus: 'active' });
}
```

### Widget Injection
```typescript
// Widget loads white-label config
async function initializeWidget(projectId: string) {
  const whiteLabel = await fetchWhiteLabelConfig(projectId);

  if (whiteLabel.widgetRemoveBranding) {
    document.querySelector('.cover-branding')?.remove();
  }

  if (whiteLabel.widgetLogo) {
    updateLogo(whiteLabel.widgetLogo);
  }

  applyBrandColors(whiteLabel.brandColors);
  updateProductName(whiteLabel.productName);
}
```

### Dashboard Theming
```typescript
// Dynamic CSS injection based on white-label config
function generateThemeCSS(config: WhiteLabelConfig): string {
  return `
    :root {
      --color-primary: ${config.brandColors.primary};
      --color-secondary: ${config.brandColors.secondary};
      --color-accent: ${config.brandColors.accent};
    }

    .logo {
      background-image: url('${config.dashboardLogo}');
    }

    .footer .powered-by {
      display: ${config.widgetRemoveBranding ? 'none' : 'block'};
    }
  `;
}
```

### API Endpoints
```
GET    /api/white-label/config              - Get white-label config
PATCH  /api/white-label/config              - Update white-label config
POST   /api/white-label/logo                - Upload logo
POST   /api/white-label/domain/verify       - Verify custom domain
POST   /api/white-label/domain/provision    - Provision SSL
GET    /api/white-label/preview             - Preview white-label changes

// Reseller endpoints
POST   /api/reseller/accounts               - Create sub-account
GET    /api/reseller/accounts               - List sub-accounts
GET    /api/reseller/accounts/:id/usage     - Get sub-account usage
PATCH  /api/reseller/accounts/:id/billing   - Update billing config
```

### License Validation
```typescript
// Ensure white-label is Enterprise-only
async function validateWhiteLabelAccess(accountId: string): Promise<void> {
  const account = await getAccount(accountId);

  if (account.plan !== 'enterprise') {
    throw new ForbiddenError('White-label requires Enterprise plan');
  }

  if (!account.features.includes('white-label')) {
    throw new ForbiddenError('White-label not enabled for this account');
  }
}
```

## Acceptance Criteria

### AC-001: Widget Branding Removal
- Given I am on Enterprise plan, I can enable "Remove Cover branding"
- When enabled, "Powered by Cover" is removed from widget
- Custom logo appears in widget header
- Widget uses my brand colors throughout
- Changes apply immediately to live widget

### AC-002: Dashboard Branding
- Given I upload dashboard logo, it replaces Cover logo in navigation
- Custom brand colors apply to all dashboard elements
- Favicon updates to my custom icon
- Product name replaces "Cover" in all user-facing text
- Dashboard maintains usability with custom theme

### AC-003: Custom Domain Setup
- Given I enter custom domain, I receive DNS configuration instructions
- When DNS is configured correctly, domain verification succeeds
- SSL certificate is provisioned automatically within 10 minutes
- Dashboard accessible via custom domain with HTTPS
- Widget API calls use custom domain

### AC-004: Email Customization
- Given I configure sender name and email, all outgoing emails use custom branding
- Email templates can be edited with WYSIWYG editor
- Cover branding removed from email footers
- Test emails can be sent before saving
- SPF and DKIM records are provided for email authentication

### AC-005: Reseller Features
- Given I am a reseller, I can create sub-accounts
- Each sub-account has isolated branding configuration
- I can view usage and billing for all sub-accounts
- Billing markup is automatically applied to sub-account charges
- Sub-accounts cannot see reseller admin dashboard

### AC-006: Preview & Rollback
- Given I make white-label changes, I can preview before applying
- Preview shows widget and dashboard with new branding
- I can revert to previous configuration if needed
- Logo upload history is maintained for 90 days

### AC-007: License Enforcement
- Given I am not on Enterprise plan, white-label settings are disabled
- Attempting to enable white-label shows upgrade prompt
- Downgrading from Enterprise reverts to default Cover branding
- License check occurs on every white-label API request

## Out of Scope (V4+)
- Mobile app white labeling
- Custom authentication screens
- White-label marketplace/template gallery
- Automatic logo generation from brand guidelines
- Multi-region custom domains
- Advanced reseller analytics and forecasting

## Success Metrics
- Percentage of Enterprise customers enabling white-label
- Reseller account creation rate
- Custom domain setup completion rate
- Time to complete white-label configuration
- Customer satisfaction with white-label features (survey)

## Questions & Decisions
- **Q**: Should we allow white-label on Pro plan?
  - **A**: No, Enterprise-only to maintain pricing tiers and exclusivity

- **Q**: Maximum number of sub-accounts per reseller?
  - **A**: Unlimited for Enterprise resellers, negotiated in contract

- **Q**: Should we support white-label mobile apps?
  - **A**: V4 feature, requires app store submissions

- **Q**: How to handle Cover attribution in backend?
  - **A**: Internal attribution maintained, customer-facing only is white-labeled

## References
- [Enterprise Pricing](https://cover.com/pricing)
- [Custom Domain Setup Guide](https://docs.cover.com/custom-domain)
- [Reseller Program](https://cover.com/reseller)
- [Roadmap: V3 Advanced Features](/docs/product/roadmap.md)
