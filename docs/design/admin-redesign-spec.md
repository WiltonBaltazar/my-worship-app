# Admin Redesign — Screen Specification

Branch: `feature/admin-dashboard-redesign` · Date: 2026-10-31
Scope: admin shell (`AdminLayout`), dashboard (`AdminHome`), and a shared page pattern for the other admin pages.
Constraint: keep the existing brand colors (orange primary, blue accent, green success, warm neutrals) and Plus Jakarta Sans.

---

## 0. What's wrong today

| Issue | Where | Effect |
|---|---|---|
| Hardcoded `slate-*` / `bg-white` instead of theme tokens | `AdminLayout`, `.admin-surface`, `AdminHome` | Admin ignores the warm palette and can't support dark mode |
| Flat 9-item nav, "Ver como Membro" mixed with real sections | `AdminLayout` sidebar | Hard to scan, no grouping |
| Duplicate titles (topbar "Painel de Gestão" + page hero "Dashboard") | Layout + Home | Wastes the first 200px of the screen |
| KPIs are counts with no context (no trend, no ministry split, no target) | `AdminHome` stats | Admin can't tell whether things are going well |
| Action items (change requests, pending users, unconfirmed members) are buried below charts | `AdminHome` | The most urgent work is the hardest to find |
| Instrument/voice stats shown as badge clouds | `AdminHome` | Can't compare at a glance |
| No ministry (DMS/GHJ) filter on the dashboard | `AdminHome` | Leaders of one ministry see mixed numbers |
| Orange text (`text-orange-600/700` on white) used for labels | Several | Small orange text sits near the AA contrast limit |

---

## 1. Structure — Layout grid

### App shell

```
┌────────────┬──────────────────────────────────────────────────────────┐
│            │ TOPBAR 64px: breadcrumb/title · [Ministério ▾] · ⌘K · 🔔 · 🌓 · avatar │
│  SIDEBAR   ├──────────────────────────────────────────────────────────┤
│  256px     │                                                          │
│ (72px rail │   CONTENT  max-w 1440px, 12-col grid                     │
│  collapsed)│   padding 16 / 24 / 32                                   │
│            │                                                          │
└────────────┴──────────────────────────────────────────────────────────┘
```

- **Sidebar**: 256px expanded, 72px icon rail when collapsed (remembered in `localStorage` key `wora:admin-sidebar`). Full height, sticky. On mobile it becomes a `Sheet` drawer.
- **Topbar**: 64px, sticky, `bg-background/85 backdrop-blur`, bottom border. It replaces both the current mobile header and the desktop "Admin Area" bar.
- **Content grid**: 12 columns, gutter 24px (16px under `md`), max width 1440px, centered.

### Grouped navigation (same routes, reorganized)

```
VISÃO GERAL
  ▣ Dashboard                 /admin-app
ESCALAS
  ▤ Escalas                   /admin-app/schedules          [drafts count]
  ⧉ Escala Técnica            /admin-app/tech-schedules
  ⊘ Indisponibilidades        /admin-app/availability
PESSOAS
  ☺ Membros                   /admin-app/members
  ⚙ Usuários                  /admin-app/users              [pending count]
CONTEÚDO
  ♪ Repertório                /admin-app/repertoire
COMUNICAÇÃO
  🔔 Notificações              /admin-app/notifications      [unread count]
─────────────
  👁 Ver como Membro           /dashboard   (footer, secondary style)
  [avatar] Nome · Função  ▾   (menu: Perfil, Tema, Sair)
```

No routes change, so `App.tsx` routing stays as it is.

### Dashboard grid (≥1280px)

```
Row A  PAGE HEADER ─ "Bom dia, {nome}" · date · [Nova escala] [Abrir chamada]      12 cols
Row B  NEEDS ATTENTION strip ─ up to 5 action tiles                                 12 cols
Row C  KPI TILES ─ 4 × 3 cols
Row D  PRÓXIMAS ESCALAS (table) 8 cols        │ INDISPONÍVEIS ESTA SEMANA   4 cols
                                              │ SOLICITAÇÕES DE TROCA       4 cols
Row E  COBERTURA DA EQUIPE (bars) 6 cols      │ DISTRIBUIÇÃO DE ESCALAS     6 cols
Row F  REPERTÓRIO (top songs / unused) 6 cols │ ATIVIDADE RECENTE           6 cols
```

---

## 2. Hierarchy — what the admin sees first

Priority order (reading order = urgency):

1. **Needs attention (Row B)**: things that block a Sunday. Shown only when the count is > 0; if everything is clear, a single line says "Tudo em dia ✓".
   | Tile | Source (existing hooks) | Action |
   |---|---|---|
   | Contas pendentes de aprovação | `usePendingProfilesCount` | → `/admin-app/users` |
   | Solicitações de troca | `schedules[].members[].requested_change` (upcoming) | → schedule details |
   | Não confirmados (próximos 7 dias) | members with `!confirmed` on schedules ≤ 7 days | → next schedule |
   | Rascunhos não publicados | `status === 'draft'` and date ≤ 14 days | → `/admin-app/schedules` |
   | Chamadas de disponibilidade a fechar | `availability_call.is_open` and deadline ≤ 3 days | → schedule |
   Tile anatomy: icon in a 32px tinted square · count (20px semibold) · label · chevron. Severity color: `destructive` if it's due within 48h, otherwise `primary`.

2. **KPIs (Row C)**: the health of the ministry.
   | KPI | Value | Secondary line | Visual |
   |---|---|---|---|
   | Próximo culto | `dom, 02 nov · 18:00` | `{confirmed}/{total} confirmados` | progress ring |
   | Taxa de confirmação | `87%` (next 30 days) | `▲ 6 pts vs. 30 dias anteriores` | sparkline (8 weeks) |
   | Escalas do mês | `6` | `4 publicadas · 2 rascunhos` | segmented bar |
   | Membros ativos | `42` | `DMS 30 · GHJ 18` (overlap counted in both) | — |

3. **Operational lists (Row D)**: the next schedules, absences and swaps.
4. **Insight (Rows E–F)**: team composition, fair rotation, repertoire usage. Useful, but not urgent.

Visual weight rules: only one primary (orange, filled) button per screen, "Nova escala". KPI numbers are the largest text on the page. Section titles stay small (16px) so the data stands out more than the labels.

---

## 3. Typography — scale (Plus Jakarta Sans, already loaded)

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 30 / 36 | 600, `tabular-nums` | KPI values |
| `h1` | 24 / 32 (20/28 mobile) | 600 | Page title |
| `h2` | 16 / 24 | 600 | Card / section titles |
| `body` | 14 / 20 | 400 | Default UI text, table cells |
| `body-strong` | 14 / 20 | 500 | Names, dates in lists |
| `caption` | 12 / 16 | 400 | Meta lines, helper text |
| `overline` | 11 / 16, `uppercase tracking-[0.08em]` | 600 | Sidebar group labels **only** |

Rules:
- Tighten the wide `tracking-[0.16em–0.2em]` overlines used everywhere today down to sidebar group labels only.
- Use `tabular-nums` for every number (counts, %, dates in tables) so columns line up.
- `h1` letter-spacing stays at the global `-0.02em`.

---

## 4. Color — same palette, used through tokens

Keep every existing HSL value in `index.css`. The changes are about **how** colors are applied, plus three new tokens.

### Mapping (replace the hardcoded classes)

| Today | Replace with |
|---|---|
| `bg-white` (page) | `bg-background` |
| `bg-white border-slate-200` (cards) | `bg-card border-border` |
| `bg-slate-50/70` (muted rows) | `bg-muted/50` |
| `text-slate-900` | `text-foreground` |
| `text-slate-500/600` | `text-muted-foreground` |
| `bg-orange-50 text-orange-700` (active nav) | `bg-primary/10 text-primary-strong` |
| `bg-orange-500` badges | `bg-primary text-primary-foreground` |

### New tokens (implemented in `resources/js/index.css`, mapped in `tailwind.config.ts`)

| Token | Light | Dark | Tailwind | Use |
|---|---|---|---|---|
| `--primary-strong` | 24 88% 40% | 28 92% 66% | `text-primary-strong` | Orange text/icons, ≥4.5:1 |
| `--success-strong` | 156 58% 26% | 156 50% 58% | `text-success-strong` | Green text (badges, "confirmado") |
| `--destructive-strong` | 3 75% 40% | 3 80% 70% | `text-destructive-strong` | Red text on tinted backgrounds |
| `--warning` / `--warning-strong` | 38 92% 50% / 26 83% 31% | 38 92% 56% / 38 92% 66% | `bg-warning/15 text-warning-strong` | Paused, pending (replaces `amber-*`) |
| `--surface-sunken` | 33 50% 97% | 210 32% 7% | `bg-surface-sunken` | Admin page canvas behind cards |
| `--ministry-dms` / `-strong` | 28 92% 56% / 24 88% 40% | 28 92% 62% / 28 92% 66% | `bg-ministry-dms`, `text-ministry-dms-strong` | DMS identity |
| `--ministry-ghj` / `-strong` | 203 78% 42% / 203 77% 35% | 203 70% 58% / 203 70% 66% | `bg-ministry-ghj`, `text-ministry-ghj-strong` | GHJ identity |
| `--chart-1…4` | orange · blue · green · warm neutral | lighter variants | `fill-chart-1` etc. | Charts |

GHJ used to be amber (`MinistryBadge`, calendar chips). It's now blue, because amber and DMS orange have about the same lightness and are hard to tell apart. To go back, change `--ministry-ghj*` only.

The `-strong` tokens are separate from `--accent` on purpose: in `.dark`, `--accent` is orange, not blue.

### Semantic use

- **Ministry identity**: DMS = orange (`chart-1`), GHJ = blue (`chart-2`). Shown as an 8px dot plus the label, never as color alone.
- **Status**: confirmed = `success`, pending = `chart-4` neutral, change requested / overdue = `destructive`, draft = outlined neutral badge.
- **Canvas**: the page uses `--surface-sunken` and cards use `--card`, so cards stand out with a 1px border and `--shadow-soft`. This replaces the heavy shadows.
- **Sidebar**: uses the existing `--sidebar-*` tokens, which are already warm. Active item: `bg-sidebar-accent text-sidebar-accent-foreground` plus a 3px left indicator in `primary`.

Contrast check: `primary` (56% L) is only for fills and large text. Body-size orange text must use `--primary-strong`.

---

## 5. Spacing — 4px base

| Token | px | Use |
|---|---|---|
| `1` | 4 | icon ↔ badge |
| `2` | 8 | icon ↔ label, inline gaps |
| `3` | 12 | list row vertical padding |
| `4` | 16 | card inner gap, mobile gutters |
| `5` | 20 | card padding (`p-5`) |
| `6` | 24 | grid gap (desktop), between cards |
| `8` | 32 | between dashboard rows, page padding at ≥1280 |

- Radius: cards `rounded-xl` (12px), inner elements `rounded-lg` (8px), pills `rounded-full`. Keep the global `--radius: 1.15rem` for the member app; admin overrides it locally through the `.admin-*` component classes. Dense data panels read better with smaller radii.
- Card anatomy: header row (`h2` + optional action link "Ver todas →") · 16px gap · body. A footer is optional, with a top border.
- Table rows: 48px tall (12px vertical padding), with a divider between rows instead of zebra stripes.

---

## 6. Responsive behavior

| Breakpoint | Sidebar | Topbar | Dashboard |
|---|---|---|---|
| `< 640` (mobile) | Drawer (`Sheet`), opened by a hamburger | Title + ministry pill + bell; search becomes an icon | 1 col. Needs-attention becomes a horizontal scroll-snap row. KPIs 2×2 (sparklines hidden). Table becomes stacked cards. Charts full width. |
| `640–1023` (tablet) | Drawer | Full topbar, "Nova escala" as an icon button | 2 cols. KPIs 2×2. Row D: table full width, side cards below in 2 cols. |
| `1024–1279` (laptop) | 72px icon rail (labels in tooltips) | Full | 12-col grid as specified; Row D 8/4; Rows E–F 6/6 |
| `≥ 1280` (desktop) | 256px expanded (collapsible) | Full | As specified; content max 1440px |

Other rules:
- Touch targets ≥ 44px on mobile (nav items, table-card rows, tiles).
- The "Nova escala" primary action also appears as a floating action button at the bottom right on mobile.
- Charts: Recharts `ResponsiveContainer`. Horizontal bars become a top-5 list on mobile.

---

## 7. Dark mode

The `.dark` token set already exists but there's no toggle, and admin can't use it because of the hardcoded slate/white classes.

- Add `next-themes` `ThemeProvider` (`attribute="class"`), already a dependency through `sonner`. Put the toggle in the topbar and the avatar menu. Options: Claro / Escuro / Sistema, persisted.
- Elevation in dark mode uses lighter surfaces instead of shadows: canvas `--surface-sunken` (7% L) → card `--card` (13% L) → popover/hover 17% L. Drop `--shadow-*` in dark mode and use borders.
- Orange in dark mode: the primary fill is 62% L. Text uses `--primary-strong` at 66% L.
- Charts: use the dark `--chart-*` values. Grid lines are `border` at 50% opacity, and axis labels are `muted-foreground`.
- Status colors keep their meaning. Tinted backgrounds use `/15` opacity in dark mode (vs `/10` in light) so they stay visible.

---

## 8. Dashboard sections — details

**Ministry filter (topbar, global for admin)**: `Todos | DMS | GHJ`. It only offers the ministries the user can see (`ledMinistries` for leaders, both for admins), and it's hidden when only one applies. Stored in the URL query (`?m=dms`) so it can be shared, and every admin page honors it.

**Próximas escalas (table)**: columns: Data/hora · Ministério (dot + label) · Tipo (Culto/Ensaio) · Equipe (avatar stack, max 5 + "+n") · Confirmação (mini bar + `x/y`) · Status badge · `⋯` menu (Abrir, Publicar, Editar). Shows 6 rows, with "Ver todas →" linking to `/admin-app/schedules`.

**Cobertura da equipe**: horizontal bars of members per instrument and per voice (tabs: Instrumentos / Vozes), sorted descending. The bar color follows the ministry when filtered. Callout row: "⚠ Nenhum baterista confirmado em 09/11", computed from upcoming schedules that are missing a function.

**Distribuição de escalas (fair rotation)**: times each member was scheduled in the last 90 days. Shows the 5 most-scheduled and the 5 least-scheduled active members ("Pouco escalados"), to help balance the rotation.

**Repertório**: top 5 songs by uses in the last 90 days (from `schedule.songs`), plus a count of "Músicas nunca usadas" that links to the repertoire filtered to those songs.

**Atividade recente**: latest 6 notifications (`useNotifications`): icon, sentence, relative time.

All metrics come from data the existing hooks already return (`useSchedules`, `useProfiles`, `useSongs`, `useNotifications`, `usePendingProfilesCount`). The first version needs no backend changes. If schedules grow large, move the aggregates to a `/api/admin/dashboard` endpoint later.

States: skeletons that match each card's shape (no full-page spinner). Every card has an empty state with a one-line explanation and a CTA. Errors are inline per card with a "Tentar novamente" button.

---

## 9. Other admin pages — shared pattern

Every page uses one `AdminPageHeader`:

```
[h1 Title]                                   [secondary actions] [Primary action]
[caption description]
[Tabs / filter bar: search · ministry · status · view toggle]
```

| Page | Organize as |
|---|---|
| Escalas | Header + filters (ministry, status, type, month). Keep the 4 view modes and move the toggle into the filter bar |
| Escala Técnica | Same header; week range picker in the filter bar |
| Indisponibilidades | Header + filters (ministry, period); "Hoje / Esta semana / Próximas" tabs |
| Membros | Data table (name, ministries, functions, can lead, status) + filter chips for instrument/voice; row click opens the edit dialog |
| Usuários | Tabs: **Pendentes ({n})** · Todos. Pending first, with an inline approve button |
| Repertório | Table with search + tags; usage count column (same data as the dashboard) |
| Notificações | Tabs: Recebidas · Enviar; unread items in bold |

New shared components (`resources/js/components/admin/`): `AdminShell` (sidebar + topbar), `AdminPageHeader`, `StatTile`, `AttentionTile`, `SectionCard`, `MinistryDot`, `MinistryFilter`.

---

## 10. Implementation phases

1. **Tokens & theme**: new CSS tokens, rewrite the `.admin-*` classes to use tokens, add `ThemeProvider` and the toggle.
2. **Shell**: grouped sidebar with collapsible rail, unified topbar, ministry filter in the URL.
3. **Dashboard**: Rows A–D first (the urgent part), then E–F.
4. **Pages**: apply `AdminPageHeader` and filter bars page by page, starting with Escalas and Usuários.
5. **QA**: run `/ui-design:responsive-audit`, check contrast in both themes, and test keyboard navigation of the sidebar and tables.
