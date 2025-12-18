# Feature: Shopify Integration

## Overview

**Feature ID**: `shopify-integration`
**Category**: Enhanced (V2)
**Priority**: P1 (Post-MVP Enhancement)
**Complexity**: L (Large)
**Estimated Effort**: 5-6 days

### Summary
Native integration with Shopify that allows the chatbot to access store data (products, orders, customers) through a custom MCP server. Enables powerful e-commerce use cases like order tracking, product recommendations, inventory checks, and customer support without manual API configuration.

### Dependencies
- `api-endpoints` - Must support MCP server connections
- `chat-engine` - Tool calling infrastructure
- `auth-system` - Shopify OAuth integration

### Success Criteria
- [ ] Connect Shopify store via OAuth
- [ ] Access products, orders, and customer data
- [ ] Chatbot can answer order status questions
- [ ] Chatbot can recommend products
- [ ] Chatbot can check inventory
- [ ] Secure credential storage
- [ ] Rate limit compliance with Shopify API

---

## User Stories

### Primary User Story
> As a Shopify store owner, I want to connect my store to my chatbot so customers can check order status and ask about products without contacting support.

### Additional Stories
1. As a customer, I want to ask the chatbot "where is my order" and get real-time status updates.
2. As a customer, I want to search for products by asking the chatbot questions.
3. As a store owner, I want customers to check product availability before ordering.
4. As a store owner, I want to set up Shopify integration without technical knowledge.

---

## Functional Requirements

### Shopify Integration

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| SHOP-001 | OAuth connection to Shopify store | Must Have | Standard OAuth 2.0 |
| SHOP-002 | Fetch product catalog | Must Have | Products, variants, prices |
| SHOP-003 | Check order status by order number | Must Have | Order details, tracking |
| SHOP-004 | Search products by keyword | Must Have | Full-text search |
| SHOP-005 | Check inventory/stock levels | Must Have | Real-time availability |
| SHOP-006 | Get customer order history | Should Have | By email/phone |
| SHOP-007 | Support multiple Shopify stores | Should Have | Per project |
| SHOP-008 | Auto-sync product data daily | Should Have | Keep catalog updated |
| SHOP-009 | Webhook updates for orders | Nice to Have | Real-time order updates |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Integrations                                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Connect your tools to give your chatbot superpowers         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🛍️  Shopify                                          │    │
│  │                                               [Setup] │    │
│  │ Connect your Shopify store to enable order          │    │
│  │ tracking, product search, and inventory checks.      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📦  Shippo                                            │    │
│  │                                         [Coming Soon] │    │
│  │ Track shipments and delivery status.                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Connect Shopify Store                         [← Back]      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Enter your Shopify store URL                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ https://your-store.myshopify.com                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Continue]                                                  │
│                                                               │
│  ─────────────────────────────────────────────────────       │
│                                                               │
│  What your chatbot will be able to do:                       │
│                                                               │
│  ✓ Check order status by order number                        │
│  ✓ Search products in your catalog                           │
│  ✓ Check product availability and inventory                  │
│  ✓ Get product details (price, description, images)          │
│  ✓ View customer order history (by email)                    │
│                                                               │
│  Your Shopify data is encrypted and never shared.            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Shopify Connected ✓                           [Disconnect]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Store: your-store.myshopify.com                             │
│  Connected: Dec 17, 2024                                     │
│                                                               │
│  Status                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ✓ Products synced: 247 products                      │    │
│  │ ✓ Last sync: 2 hours ago                             │    │
│  │ ✓ API rate limit: 85% remaining                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Available Tools                                              │
│  • get_order_status - Check order by number                  │
│  • search_products - Search product catalog                  │
│  • check_inventory - Check product availability              │
│  • get_product_details - Get product information             │
│                                                               │
│  [Test Connection]  [Sync Now]                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Database Schema

```sql
-- shopify_connections table
CREATE TABLE shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) UNIQUE,
  shop_domain TEXT NOT NULL, -- 'your-store.myshopify.com'
  access_token TEXT NOT NULL, -- Encrypted
  scope TEXT NOT NULL, -- 'read_products,read_orders'
  installed_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  products_count INTEGER DEFAULT 0,
  webhook_id TEXT, -- For real-time updates
  created_at TIMESTAMP DEFAULT NOW()
);

-- shopify_products_cache table (for performance)
CREATE TABLE shopify_products_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES shopify_connections(id),
  shopify_product_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  inventory_quantity INTEGER,
  image_url TEXT,
  product_data JSONB, -- Full product object
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(connection_id, shopify_product_id)
);

CREATE INDEX shopify_products_search_idx ON shopify_products_cache
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

### Shopify OAuth Flow

```typescript
// apps/api/src/routes/shopify-oauth.ts
import { Shopify } from '@shopify/shopify-api';

const shopify = new Shopify({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'read_orders', 'read_customers'],
  hostName: 'chatbot.com',
});

// Step 1: Initiate OAuth
router.get('/shopify/:projectId/connect', async (req, res) => {
  const { projectId } = req.params;
  const { shop } = req.query; // 'your-store.myshopify.com'

  const authRoute = await shopify.auth.begin({
    shop,
    callbackPath: `/api/shopify/${projectId}/callback`,
    isOnline: false,
  });

  res.redirect(authRoute);
});

// Step 2: OAuth callback
router.get('/shopify/:projectId/callback', async (req, res) => {
  const { projectId } = req.params;
  const { code, shop } = req.query;

  try {
    // Exchange code for access token
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // Encrypt and save access token
    const encryptedToken = await encrypt(session.accessToken);

    await supabase.from('shopify_connections').upsert({
      project_id: projectId,
      shop_domain: shop,
      access_token: encryptedToken,
      scope: session.scope,
      installed_at: new Date(),
    });

    // Initial product sync
    syncShopifyProducts(projectId, shop, session.accessToken);

    res.redirect(`/dashboard/${projectId}/integrations?success=true`);
  } catch (error) {
    console.error('Shopify OAuth error:', error);
    res.redirect(`/dashboard/${projectId}/integrations?error=oauth_failed`);
  }
});
```

### Shopify MCP Server

```typescript
// apps/mcp-server/src/servers/shopify.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Shopify } from '@shopify/shopify-api';

interface ShopifyConfig {
  shop: string;
  accessToken: string;
}

const server = new Server({
  name: 'shopify-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Tool: Get Order Status
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_order_status') {
    const { order_number } = args;
    const config = await getShopifyConfig();

    const client = new Shopify.Clients.Rest({
      session: {
        shop: config.shop,
        accessToken: config.accessToken,
      },
    });

    const response = await client.get({
      path: `orders`,
      query: { name: order_number },
    });

    const order = response.body.orders[0];

    if (!order) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Order not found',
              order_number,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            order_number: order.name,
            status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            total_price: order.total_price,
            created_at: order.created_at,
            items: order.line_items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
          }),
        },
      ],
    };
  }

  if (name === 'search_products') {
    const { query } = args;
    const config = await getShopifyConfig();

    // Search in cached products for performance
    const { data } = await supabase
      .from('shopify_products_cache')
      .select('*')
      .textSearch('title || description', query)
      .limit(5);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            data.map((p) => ({
              title: p.title,
              price: p.price,
              inventory: p.inventory_quantity,
              image: p.image_url,
            }))
          ),
        },
      ],
    };
  }

  if (name === 'check_inventory') {
    const { product_id } = args;
    const config = await getShopifyConfig();

    const client = new Shopify.Clients.Rest({
      session: {
        shop: config.shop,
        accessToken: config.accessToken,
      },
    });

    const response = await client.get({
      path: `products/${product_id}`,
    });

    const product = response.body.product;
    const totalInventory = product.variants.reduce(
      (sum: number, v: any) => sum + v.inventory_quantity,
      0
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            product_id,
            title: product.title,
            total_inventory: totalInventory,
            in_stock: totalInventory > 0,
            variants: product.variants.map((v: any) => ({
              title: v.title,
              inventory: v.inventory_quantity,
              price: v.price,
            })),
          }),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Tool definitions
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'get_order_status',
        description: 'Get the status of a Shopify order by order number',
        inputSchema: {
          type: 'object',
          properties: {
            order_number: {
              type: 'string',
              description: 'The order number (e.g., #1001)',
            },
          },
          required: ['order_number'],
        },
      },
      {
        name: 'search_products',
        description: 'Search for products in the Shopify store',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (product name, keywords)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'check_inventory',
        description: 'Check inventory availability for a product',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Shopify product ID',
            },
          },
          required: ['product_id'],
        },
      },
    ],
  };
});
```

### Product Sync Service

```typescript
// apps/api/src/services/shopify-sync.ts
async function syncShopifyProducts(
  projectId: string,
  shop: string,
  accessToken: string
): Promise<void> {
  const client = new Shopify.Clients.Rest({
    session: { shop, accessToken },
  });

  let page = 1;
  let hasMore = true;

  const connection = await getShopifyConnection(projectId);

  while (hasMore) {
    const response = await client.get({
      path: 'products',
      query: { limit: 250, page },
    });

    const products = response.body.products;

    if (products.length === 0) {
      hasMore = false;
      break;
    }

    // Cache products
    for (const product of products) {
      const totalInventory = product.variants.reduce(
        (sum: number, v: any) => sum + v.inventory_quantity,
        0
      );

      await supabase.from('shopify_products_cache').upsert({
        connection_id: connection.id,
        shopify_product_id: product.id,
        title: product.title,
        description: product.body_html,
        price: product.variants[0]?.price || 0,
        inventory_quantity: totalInventory,
        image_url: product.images[0]?.src,
        product_data: product,
        synced_at: new Date(),
      });
    }

    page++;
  }

  // Update sync timestamp
  await supabase
    .from('shopify_connections')
    .update({
      last_sync_at: new Date(),
      products_count: await getProductCount(connection.id),
    })
    .eq('id', connection.id);
}

// Run daily via cron
// 0 2 * * * (daily at 2am)
```

---

## Acceptance Criteria

### Definition of Done
- [ ] OAuth connection flow works end-to-end
- [ ] Products sync from Shopify store
- [ ] Order status tool works with order number
- [ ] Product search tool finds relevant products
- [ ] Inventory check tool returns accurate stock levels
- [ ] Credentials encrypted in database
- [ ] Rate limits respected (Shopify API limits)
- [ ] Daily product sync runs automatically
- [ ] Disconnect removes all data

### Demo Checklist
- [ ] Connect test Shopify store
- [ ] Verify products synced
- [ ] Ask chatbot "where is order #1001"
- [ ] Ask chatbot "do you have blue widgets"
- [ ] Ask chatbot "is product X in stock"
- [ ] Disconnect store

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | Invalid shop domain | Show validation error |
| 2 | OAuth declined | Redirect with error message |
| 3 | Order not found | Return "order not found" to LLM |
| 4 | Rate limit hit | Queue request, retry later |
| 5 | Connection expired | Prompt to reconnect |
| 6 | Large product catalog (10k+) | Paginate sync, use cache |
| 7 | Product deleted | Remove from cache on sync |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| OAuth flow completion | <10s |
| Order status lookup | <2s |
| Product search | <1s (cached) |
| Initial product sync (1000 products) | <5 minutes |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
