# Mastery Academy Admin: clickable prototype

A static HTML/JS prototype of the new Mastery Academy admin dashboard. Use it to check the
navigation architecture and the shared page templates with real admins before building
the production Next.js admin. It replaces the legacy panel (`panel.emasteryacademy.com`)
areas listed in the legacy discovery report.

- Arabic first (RTL), with an English (LTR) toggle. Light and dark themes.
- No build step. Plain ES modules and hand-written mock data. It makes no network calls.
- Built on the Mastery Academy design system (see [Design system](#design-system)).

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

ES modules don't load from `file://`, so open it through a local server.

## Navigation architecture

Navigation has three layers. The sidebar holds **stable destinations only**: records, wizards
and the course studio are contextual routes underneath them.

| Layer | Pattern | Example |
|---|---|---|
| Business domain | Primary rail | Sales |
| Feature | Secondary sidebar (sections + items) | Commerce → Orders |
| Entity list | Table with search, filters, saved views, paging, bulk actions | All orders |
| Entity details | Dedicated route with tabs | `#/sales/orders/1042/payments` |
| Multi-step process | Wizard (stepper, per-step validation, draft autosave/restore, leave warning) | Issue refund, Create course, Create coupon |
| Quick action | Drawer or modal | Change order status, Enrol customer |
| Deep location | Breadcrumbs | Sales / Orders / #ORD-1042 / Refund |
| Anything, by name | Command palette (Ctrl/⌘ K) | "1030", "create course", a customer email |

The active sidebar item is the most specific `href` that matches on whole path segments, so
`/sales/orders/1042/refund` highlights **Orders** and `/sales/orders-archive` doesn't match it.

### Information architecture

| Domain | Sections → items |
|---|---|
| Home | Dashboard · Ops inbox |
| Sales | Commerce: Overview · Orders · Payments · Refunds · Invoices — Pricing: Coupons · Price lists · Offers |
| Learning | Catalog: Courses · Packages & diplomas · Categories · Consultations — Delivery: Instructors · Instructor applications · Certificates · Q&A inbox |
| Customers | People: Customers · Segments — Support: Tickets |
| Marketing | Acquisition: Affiliates · Commissions · Payout requests · Announcement bars — Website: Banners & sliders |
| Analytics | Reports: Sales · Products · Coupons · Customers · Affiliates · Ratings · Certificates |
| Settings | Workspace: General · Team & roles · Integrations · Notifications · Audit log |
| B2B | Disabled rail item: B2B stays in the legacy panel (out of scope) |

### Contextual routes

| Route | What it shows |
|---|---|
| `sales/orders/:id/{overview,items,payments,activity}` | Order details |
| `sales/orders/:id/refund` | Refund wizard: Amount → Review → Result. The result screen tells "request sent" apart from "gateway confirmed" |
| `sales/coupons/new`, `sales/coupons/:id/{overview,scope,usage}` | Coupon wizard and details |
| `learning/courses/new` | Create-course wizard: Basic info → Curriculum → Pricing → Publishing |
| `learning/courses/:id/{overview,pricing,media,students,revenue,ratings,certificates,rules}` | Course details |
| `learning/courses/:id/studio/{curriculum,quizzes,assignments,live-sessions,forum,wiki,glossary,gradebook}` | **Course studio**: full-width workspace (the sidebar hides; the rail stays). The curriculum outline supports drag-and-drop, plus Move up/down buttons for keyboard users |
| `learning/packages/:id/{overview,courses,pricing,rules,certificates}` | Package details |
| `customers/:id/{overview,orders,enrollments,certificates,tickets,activity}` | Customer 360 with support actions: enrol, revoke, extend, rename on certificate, give coupon, reset password, suspend |
| `customers/tickets/:id` | Ticket conversation, plus a side panel for status, priority and assignee |
| `marketing/affiliates/:id/{overview,commissions,payouts,coupons,bank}` | Affiliate details (bank details masked) |
| `settings/team/:roleId` | Scope matrix, mapped to the legacy permission modules |

## Things to try

- **Hover a domain in the rail** to see its pages in the sidebar without leaving the current page;
  move away and the sidebar returns to the current domain. Keyboard focus does the same (Esc returns).
  With the sidebar collapsed (Ctrl/⌘ B) or in the course studio, hovering opens it as a fly-out.
  In the phone menu, the first tap on a domain shows its pages.
- **Ctrl/⌘ K** opens the command palette. Try `1030` (order), `create`, a course name, or `student001`.
- **Ctrl/⌘ B** collapses the sidebar. **/** focuses the sidebar's page search.
- Avatar menu → **View as**: switch the demo role (Super, Sales, Content, Support). Navigation,
  actions and direct URLs follow the role's scopes. This is presentation only; the API must
  enforce every scope.
- Start the create-course wizard, type something, leave the page, then come back. The draft is offered for restore.
- Orders: filter by gateway, then **Save current view**.
- Resize to phone width: the rail and sidebar turn into a drawer.

## Code layout

```
index.html                 shell; links design-system CSS
design-system/             Mastery Academy design system (tokens, components, sprite)
admin/css/admin.css        admin-only layout and components on the kit tokens
admin/js/
  main.js                  boot, theme, language, shell controls, keyboard shortcuts
  router.js                hash router with :params, optional segments and a leave-page guard
  config/navigation.js     NavModule[]: single source for the rail, sidebar, search and active matching
  config/routes.js         route table (+ presentation-level permission guard)
  i18n.js                  ar/en strings, direction, Intl number/money/date formatting
  permissions.js           demo roles and scope checks
  store.js                 guarded localStorage for per-viewer preferences and drafts
  components/              shell, data-table, wizard, command-palette, chart, ui helpers, icons
  data/db.js               deterministic mock data shaped like the legacy endpoints
  pages/                   one module per domain; route files stay thin
```

`config/navigation.js` uses the same shape as the planned TypeScript `NavModule[]`, so it
ports 1:1 to `src/config/navigation.ts`. The page modules map to `features/<domain>`, and
`components/` maps to `components/admin/` in the Next.js structure.

## Design system

The prototype uses the Mastery Academy design system in `design-system/`:

| File | Source |
|---|---|
| `tokens.css` | Taken from the kit's `demo.html` (the "generated from tokens.json" block) |
| `components.css`, `fonts.css`, `demo.html`, `README.md`, `docs/05-components.md` | Kit files as delivered |
| `sprite.svg` | Taken from `demo.html`: `#ma-logo`, `#ma-mark` and the kit icons. Also inlined in `index.html` |

Load order in `index.html`: `fonts.css` → `tokens.css` → `components.css` → `admin/css/admin.css`.

- Buttons, tags, fields, checkboxes, alerts, avatars and links are the kit's `.ma-*` components.
  Admin buttons map to the kit variants: one **primary** (coral) per view, **secondary** (ink)
  for strong second actions, and **soft** for everything else; icon tools are **bare**.
- `admin/css/admin.css` adds only what the kit doesn't have yet (shell, rail, sidebar, tables,
  drawers, stepper, command palette, studio). These follow the kit's rules for new components:
  `.ma-<name>` naming, radii from the scale, 1px rules, no shadows, logical properties, role tokens.
- Status badges always show a word; the status colour is a small square next to it, because the
  kit's success/warning/danger colours are bright fills and don't work as text colours.
- The rail uses the kit's ink field (like the footer) with the coral `#ma-mark`.

Still missing from the kit: the `.woff2` files that `fonts.css` points to (`assets/fonts/`),
the other `docs/` pages, `tokens.json` and the logo files. Until the font files arrive,
IBM Plex Sans Arabic loads from Google Fonts. English text uses the kit's `--font-sans`
stack, which falls back to Helvetica Neue/Arial until Neue Montreal is licensed.

## Data and security notes

- All data is illustrative and generated in `admin/js/data/db.js`. It contains no real customers,
  emails or orders. Enums follow the legacy discovery report: order status 3 = paid, 1 = not
  completed; productType 1 = course, 3 = consultation, 6 = package.
- Labels for legacy numeric enums that the business hasn't confirmed (coupon reasons 4–7, ticket
  type/status/priority) show a warning flag.
- Integration secrets are never displayed; they can only be replaced. Affiliate bank details
  show the last 4 digits only.
- Lists are paged in the `{ page, pageSize, total }` shape, to replace the legacy panel's unpaged
  490 KB–1.6 MB responses.

## Recommended next steps

1. Run the main workflows (refund, enrol a customer, publish a course, answer Q&A) with 3–5
   admins, and adjust group names before locking the menu.
2. Port to Next.js App Router: `app/(admin)/<domain>/...` routes, `config/navigation.ts`,
   `features/<domain>`, wired to `/api/v1/admin/backoffice/...`.
3. Map the 61 legacy permission modules to scope strings (`settings/team/:roleId` shows the
   proposed grouping).
4. Replace the dashboard's ~30 legacy requests with one `GET /admin/analytics/summary`.
