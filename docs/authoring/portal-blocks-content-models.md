# Portal Template Blocks — Authoring Content Models

Content models for the co-branded **Digital Opportunities Portal** template blocks, in
the format from the project's `content-modeling` skill. Use these when authoring in
da.live, and to seed the DA **Block Library** (`https://da.live/#/{org}/{site}/.da/library`).

Blocks render in the DA canvas by previewing the live Edge Delivery code (the block's
`.js`/`.css`) — there is **no separate per-block template/model file** in this repo (no
Universal Editor `component-*.json`; no block ships a definition file). So "author-ready"
here means: a correct table structure + this reference.

> **Status:** all six blocks (`insights`, `video-gallery`, `product-cards`, `quote`,
> `contact-cta`, `cobrand-logos`) reflect the updated design and are current. The four
> above were built from `get_design_context`; `contact-cta` and `cobrand-logos` were built
> from design screenshots (Figma MCP was rate-limited) — colours/spacing are read off the
> image, and the **Adobe wordmark + amazon logo remain to be supplied as real SVG assets**
> (trademarked marks are not recreated).

> **⚠️ Contracts changed** in the redesign. Any existing DA page or Library entry built on
> the old cells will render wrong until updated to the structures below.

---

## insights  — *Collection*

Industry-intelligence cards: tone-coloured pill badge + big number + sub-label + body +
source. One row per card; `warn` / `trend` / `benchmark` drive the badge colour and icon.

### Block Structure

| Insights | | | | | |
|---|---|---|---|---|---|
| badge label | big number | sub-label | body (keeps **bold** emphasis) | tone | source (link) |

- **big number:** any non-digit run renders smaller automatically ("3 **of** 5", "+41**%**", "1.9**s**").
- **tone:** `warn` (amber / blindspot icon), `trend` (green / chart), `benchmark` (blue / settings). Blank ⇒ neutral.
- **body:** authored `<strong>`/`<b>` renders in the orange accent.
- **source:** optional; a leading "Source:" is added if absent.

### Example (one card)

| Insights | | | | | |
|---|---|---|---|---|---|
| Blindspot | 3 of 5 | top rivals now cited by AI shopping assistants | Competitors have shipped structured product data that AI engines prefer. You appear in 1 of 5. **Closing this gap is the fastest visibility win**. | warn | https://www.example.com/blog-blog |

### Key points
- Each row = one card (3-up desktop, 1-up mobile).
- `tone` is data (per-card), not a block variant.
- ⚠️ **6 cells exceeds the skill's ≤4 guideline** — see *Best-practice review*.

---

## video-gallery  — *Collection* (+ folded-in header)

Featured video (first video row) + a list of smaller videos. An optional **header row**
(no link/image in its first cell) renders the section eyebrow/heading/subhead.

### Block Structure

| Video Gallery | | |
|---|---|---|
| eyebrow | heading | subhead |  ← *optional header row* |
| video link (+ optional poster image) | eyebrow | title |
| video link (+ optional poster image) | eyebrow | title |

- **Header row** is detected as the first row whose first cell has no link or image.
- First **video** row = the large featured card; the rest = the right-hand list.
- Link may be YouTube / Vimeo / `.mp4|.webm|.ogg|.mov`; clicking the media plays inline.

### Example

| Video Gallery | | |
|---|---|---|
| Products in action | Product Videos | Featured sessions — including joint stories where Adobe and Meridian both take the stage. |
| [Watch](https://youtu.be/dQw4w9WgXcQ) *(+ poster image)* | Adobe × Amazon | Rebuilding meridian.com on Edge Delivery — the full story |
| [Watch](https://youtu.be/…) *(+ poster image)* | Experience Cloud | Personalization at retail scale |
| [Watch](https://youtu.be/…) *(+ poster image)* | Gen Studio | From brief to campaign in a day |

### Key points
- ≤3 cells per row ✅.
- Header row is optional — omit it to render videos only.

---

## product-cards  — *Collection* (carousel, + folded-in header)

Horizontally-scrollable product cards with a folded-in header (eyebrow + heading + the
prev/next arrows) and an intro line. One row per product.

### Block Structure

| Product Cards | | | | | |
|---|---|---|---|---|---|
| eyebrow | heading | intro |  ← *optional header row (3 cells)* | | |
| thumbnail image | title | description | state | plan | tone |

- **Header row** = the first row whose first cell has **no image**.
- **state:** e.g. "Active" / "Trial" (shown with a coloured dot).
- **plan:** e.g. "Enterprise Plan" / "Trial Plan" (coloured by tone).
- **tone:** `positive` (green) / `notice` (orange). Blank ⇒ inferred from `state` (starts "Trial" ⇒ notice).

### Example

| Product Cards | | | | | |
|---|---|---|---|---|---|
| What you use today | Your Adobe Products | This is what you own today and gives you visibility into where there's room to expand. | | | |
| *(thumbnail)* | Adobe Experience Manager | Content and Edge Delivery powering meridian.com and three regional sites. | Active | Enterprise Plan | positive |
| *(thumbnail)* | GenStudio | On-brand content generation. Currently in a 60-day evaluation with the campaigns team. | Trial | Trial Plan | notice |

### Key points
- Each product row = one card; the row overflows into a swipeable carousel with arrows.
- ⚠️ **6 cells exceeds the skill's ≤4 guideline** — see *Best-practice review*.

---

## quote  — *Standalone*

Near-black centered testimonial banner. Single row.

### Block Structure

| Quote | | |
|---|---|---|
| quote text | author name | author role |

### Example

| Quote | | |
|---|---|---|
| We shipped a new storefront in six weeks and cut publish time from days to minutes. | Jordan Maru | VP, Digital Experience — Amazon |

### Key points
- One row, 3 cells ✅. Decorative quotation mark is static (not authored).
- The old `initials` cell was **removed** (no avatar in the new design).

---

## contact-cta  — *Standalone* (composite)

A red CTA card + a "reach out" contact directory. Distinct row types.

### Block Structure

| Contact CTA | | | |
|---|---|---|---|
| eyebrow | heading | description | cell with 1–2 links |  ← *CTA card* |
| eyebrow | heading | | |  ← *aside header* |
| icon | name | detail | |  ← *contact row (repeatable)* |

- **CTA links:** first renders solid, second ghost. A button icon is inferred from the
  link text (download vs. schedule/meet).
- **contact icon:** `user` / `team` / `briefcase` (rendered in a grey tile), or an authored
  image, or short initials.
- **detail:** may hold a title and an email ("Account Director · a@b.com"); a **Send Email**
  button is auto-built from the email (or a `mailto:` link) in the cell.

### Example

| Contact CTA | | | |
|---|---|---|---|
| Next steps? | Ready to reverse the visibility trend? | Book a working session with your Adobe team to turn these insights into a 90-day plan. | [Schedule a meeting](#)[Download full report](#) |
| You could also | Reach out to us directly | | |
| user | Arun Taneja | Account Director · taneja@adobe.com | |
| team | Solutions Engineering Team | DL-SolutionsEngineering-US@adobe.com | |

### Key points
- ≤4 cells per row ✅. Contact rows are hairline-separated (no card boxes); a vertical
  divider sits between the two columns on desktop.

---

## cobrand-logos  — *Collection* (logo lockup)

Adobe + partner logo lockup with an optional caption. One row per partner brand.

### Block Structure

| Cobrand Logos | | | |
|---|---|---|---|
| partner logo (image or initials) | name | link | colour |
| *(optional last row)* caption text | | | |

- The **Adobe mark is auto-prepended** (unless `no-adobe`). Partner logos are **authored
  images** — for a dark footer, supply light/white versions.
- A trailing **single prose cell** becomes the caption (rendered after a pipe divider).
- **Variants:** `center`, `no-adobe`, `dark` (light logos/text on a dark bar), `plain`
  (space logos instead of "×" dividers).

### Example (dark footer)

Block: `Cobrand Logos (dark, plain)`

| Cobrand Logos | | | |
|---|---|---|---|
| *(partner logo image)* | Amazon | | |
| Adobe × Amazon — confidential | | | |

### Key points
- ≤4 cells per row ✅.
- ⚠️ **Asset dependency:** the customer logo is author-supplied; a **white Adobe wordmark
  SVG** should replace the auto-inverted glyph for an exact match. Trademarked marks are
  never hand-drawn.

---

## Best-practice review (content-modeling skill)

The skill's checklist is **≤4 cells per row**, prefer semantic formatting and block
variants over config cells, and infer with smart defaults. Two blocks deviate — carried
over from the original prototypes and extended. As-built they work; if we want them
skill-compliant, here are the recommended tightenings (each is a JS decoration change +
harness re-verify, **not done yet**):

- **insights (6 → 3 cells):** infer `tone` from the badge label (Blindspot⇒warn,
  Trend⇒trend, Benchmark⇒benchmark) to drop the `tone` cell; combine number+sub into one
  cell (number bold, sub as text) and body+source into one cell (body paragraph + a source
  link paragraph). Result: `badge | number + sub | body + source`.
- **product-cards (6 → 4 cells):** `tone` is already inferable from `state` ("Trial" ⇒
  notice) — drop the explicit `tone` cell; combine `state` + `plan` into one status cell
  ("Active · Enterprise Plan", styled by decoration). Result:
  `image | title | description | status`.
- **Folded-in headers (video-gallery, product-cards):** a header row is a distinct row
  type inside a Collection, which the skill mildly discourages. The standard EDS
  alternative is to author the eyebrow/heading as **default content above the block**
  (a normal `H2` + eyebrow paragraph) and keep the block cards-only. We deliberately folded
  it in (product-cards needs the carousel arrows in that header); the header row stays
  optional so cards-only authoring still works.

`video-gallery` and `quote` already satisfy the checklist.
