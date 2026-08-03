import { buildShareForm, buildShareSection, folderToDeepLink } from './share-form.js';

const LETTERS = '0-9 A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' ');

const RECENT_MAX = 8;
const recentKey = (mode) => `cp-recent-${mode}`;

/** Read the recent-entry list for a mode. Returns [] on any storage failure. */
function readRecent(mode) {
  try {
    const raw = localStorage.getItem(recentKey(mode));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Record an opened company for a mode: dedupe by folder, newest first, cap at
 * RECENT_MAX. Entries without a Folder are skipped (nothing to re-open).
 * Storage failures are swallowed — recents are a convenience, never required.
 */
function pushRecent(mode, company) {
  if (!company || !company.Folder) return;
  try {
    const entry = { company: company.Company, folder: company.Folder, ts: Date.now() };
    const next = [entry, ...readRecent(mode).filter((e) => e.folder !== entry.folder)]
      .slice(0, RECENT_MAX);
    localStorage.setItem(recentKey(mode), JSON.stringify(next));
  } catch {
    // ignore: storage unavailable/full
  }
}

function getLetterGroup(name) {
  const first = name.trim().charAt(0).toUpperCase();
  return /\d/.test(first) ? '0-9' : first;
}

// Known event landing-page variants. A website folder can hold several of these
// in parallel (e.g. a Cannes and a Summit report), so they render as separate
// selectable reports inside one website card.
const EVENT_FORMATS = {
  'cannes-2026': 'Cannes Lions 2026',
  'summit-2026': 'Adobe Summit 2026',
};

/**
 * Event portal tabs are CONTENT, not code. Each event is one extra mode in the
 * picker, backed by one column in `insights-list.json`: a row whose `<column>`
 * cell is non-empty is in that event, and the cell value is the card label (the
 * event-specific company name, which can differ per event). Which columns become
 * tabs — and in what order, under what label — is authored in the DA sheet
 * `/data/event-tabs.json`, so **adding an event needs no code change**: add a
 * sheet row + populate the matching column in `insights-list`.
 *
 * Unlike the Insight Reports tab (one card per website globally), event tabs
 * build ONE CARD PER FLAGGED ROW so the same company can appear in several
 * events and two companies sharing a page each keep their card.
 */

/** Non-event columns in `insights-list`. Every OTHER column is an event flag —
 *  this is what the no-config fallback keys off. */
const INSIGHTS_DATA_COLUMNS = new Set(['Report', 'Customers', 'Folder', 'Created', 'Report Notice']);

/** Built-in picker modes. An event row may never claim one of these ids. */
const BUILTIN_MODE_IDS = new Set(['accounts', 'insights', 'portal']);

/** Ids of the event modes resolved at init — drives `isReportMode` (dialog
 *  layout) for whatever tabs the sheet happens to define this session. */
const EVENT_MODE_IDS = new Set();

/** Slugify a sheet value into a mode id (`Summit Mumbai 2026` → `summit-mumbai-2026`). */
export function slugifyModeId(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** An `Active` cell is opt-OUT: only an explicit falsy word hides the tab, so a
 *  freshly added row with the column left blank still shows. */
function isActiveCell(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  return !['false', 'no', '0', 'off', 'n'].includes(v);
}

/**
 * Fallback when `/data/event-tabs.json` is missing or defines no usable rows:
 * derive one tab per non-reserved `insights-list` column that has at least one
 * non-empty cell, labelled by the column header. Keeps the picker working
 * (rather than losing every event tab) if the sheet is unpublished or broken —
 * order is whatever key order the JSON carries, which is exactly the control the
 * config sheet exists to provide.
 */
export function deriveEventModes(insightRows) {
  const columns = [];
  const seen = new Set();
  for (const row of insightRows || []) {
    for (const key of Object.keys(row)) {
      if (!INSIGHTS_DATA_COLUMNS.has(key) && !seen.has(key) && String(row[key] || '').trim()) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns
    .map((column) => ({ id: slugifyModeId(column), label: column, column }))
    .filter((m) => m.id && !BUILTIN_MODE_IDS.has(m.id));
}

/**
 * Resolve the event tabs from the `/data/event-tabs.json` rows. Columns:
 *   - `Column`  (required) the `insights-list` column this tab reads
 *   - `Label`   tab text; defaults to `Column`
 *   - `Active`  set `false` to retire a finished event without deleting its data
 *   - `Id`      optional stable mode id (localStorage recents key, `cp-recent-<id>`);
 *               defaults to a slug of `Column`. Pin it to keep recents across a rename.
 * Row order is tab order. Rows with no `Column`, a duplicate/built-in id, or
 * `Active: false` are dropped. If nothing usable survives, fall back to
 * `deriveEventModes` so the tabs never silently disappear.
 */
export function parseEventModes(configRows, insightRows) {
  const modes = [];
  const seen = new Set();
  for (const row of Array.isArray(configRows) ? configRows : []) {
    const column = String(row.Column || '').trim();
    const id = slugifyModeId(row.Id || column);
    if (column && id && isActiveCell(row.Active) && !BUILTIN_MODE_IDS.has(id) && !seen.has(id)) {
      seen.add(id);
      modes.push({ id, label: String(row.Label || '').trim() || column, column });
    }
  }
  return modes.length ? modes : deriveEventModes(insightRows);
}

/**
 * Per-report data notices. A report's `Report Notice` cell (in insights-list)
 * holds one of these codes when a section was omitted because no data came back
 * for that customer's domain (SEO/keyword data from Semrush, an Adobe company;
 * AI mentions from Adobe's AI-visibility data). The modal surfaces the matching
 * message so a sales rep understands it's a data limitation for that domain —
 * NOT an error in the report. Copy lives here; the sheet only carries the code,
 * so wording can change without re-tagging reports.
 */
const REPORT_NOTICES = {
  'no-ai-visibility': {
    title: 'No AI Visibility section',
    body: 'No AI-visibility data was available for this domain, so the AI Visibility section was left out. The rest of the report is complete.',
  },
  'no-keyword-data': {
    title: 'No Keyword Opportunities section',
    body: 'Semrush returned no keyword/ranking data for this domain, so the Keyword Opportunities section was left out. The rest of the report is complete.',
  },
  'no-seo-ai': {
    title: 'Site performance only',
    body: 'No SEO or AI-visibility data was available for this domain (often because it redirects elsewhere or blocks data collection), so the report covers site performance only.',
  },
  'no-report': {
    title: 'Report not available',
    body: "We couldn't gather enough data for this domain to generate a report.",
  },
};

/** Website-report modes (Insight Reports + every event tab) share one dialog
 *  layout — websites, per-format reports, per-page share — distinct from the
 *  accounts/portal directory layout. */
function isReportMode(mode) {
  return mode === 'insights' || EVENT_MODE_IDS.has(mode);
}

/**
 * Split an insight-report folder into its website slug and optional variant.
 * DIH folders are `…/insights/<website>/[variant]/` where <variant> is empty
 * (the bare report), `portal-landing`, or an event id (`cannes-2026`, …). The
 * website slug (e.g. `ey-com`) is the anchor; everything deeper is a variant of
 * the SAME website. The full folder is returned so a card can link to it.
 */
export function parseInsightFolder(folder) {
  const f = (folder || '').replace(/\/+$/, '');
  const marker = '/insights/';
  const idx = f.indexOf(marker);
  if (idx < 0) return { website: '', variant: '', folder: `${f}/` };
  const [website = '', variant = ''] = f.slice(idx + marker.length).split('/').filter(Boolean);
  return { website, variant, folder: `${f}/` };
}

/**
 * Parse a DIH `Created` value (`D.MM.YYYY`) into a sortable integer so we can
 * pick the most recent variant. Missing/unparseable dates sort oldest (0).
 */
function createdSortKey(created) {
  const m = (created || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return 0;
  const [, d, mo, y] = m;
  return Number(y) * 10000 + Number(mo) * 100 + Number(d);
}

/**
 * Collapse insight-report rows so each WEBSITE appears EXACTLY ONCE — keyed by
 * the website slug GLOBALLY, across every account folder. DIH publishes a row
 * per account×website×variant, so the same site (e.g. `ey.com` under `ey`,
 * `ey-studio`, `ernst-young`) otherwise renders several times.
 *
 * Selection rules per website (a visitor from any subsidiary lands on the same
 * page):
 *   - If any `portal-landing` variant exists, it WINS — the card links to the
 *     MOST RECENT portal-landing (by `Created`) and offers no other variant.
 *   - Otherwise, if event variants exist (Cannes/Summit), the card lists each
 *     (most-recent per format) as a selectable report, plus the bare report.
 *   - Otherwise the card links to the most recent bare/other report.
 */
export function groupInsightsByWebsite(rows) {
  const groups = new Map();
  for (const row of rows) {
    const { website, variant, folder } = parseInsightFolder(row.Folder);
    const key = website || folder; // global key across accounts
    if (!groups.has(key)) {
      groups.set(key, { Report: row.Report, Customers: row.Customers, variants: [] });
    }
    const g = groups.get(key);
    // Carry a per-report data notice (e.g. a section omitted because no data
    // came back for this domain). The portal-landing row is the canonical one;
    // prefer its notice but fall back to any variant that has one.
    if (row['Report Notice'] && (!g.ReportNotice || /portal-landing/.test(row.Folder || ''))) {
      g.ReportNotice = row['Report Notice'];
    }
    g.variants.push({ variant, folder, created: createdSortKey(row.Created) });
    if (!g.Report && row.Report) g.Report = row.Report;
    if (!g.Customers && row.Customers) g.Customers = row.Customers;
  }

  const mostRecent = (list) => [...list].sort((a, b) => b.created - a.created)[0];

  return [...groups.values()].map((g) => {
    const portalLandings = g.variants.filter((v) => v.variant === 'portal-landing');
    let folder;
    let formats = [];

    if (portalLandings.length) {
      // Portal landing is canonical — most recent wins, suppress everything else.
      folder = mostRecent(portalLandings).folder;
    } else {
      const events = g.variants.filter((v) => EVENT_FORMATS[v.variant]);
      if (events.length) {
        // One report per event format (most recent of each), bare report first.
        const byFormat = new Map();
        for (const v of events) {
          const cur = byFormat.get(v.variant);
          if (!cur || v.created > cur.created) byFormat.set(v.variant, v);
        }
        formats = [...byFormat.entries()]
          .map(([format, v]) => ({ format, label: EVENT_FORMATS[format], folder: v.folder }))
          .sort((a, b) => a.label.localeCompare(b.label));
        const bare = mostRecent(g.variants.filter((v) => v.variant === ''));
        if (bare) formats.unshift({ format: '', label: 'Insight report', folder: bare.folder });
        folder = formats[0].folder;
      } else {
        folder = mostRecent(g.variants).folder;
      }
    }

    return {
      Company: g.Report || g.Customers || folder,
      Report: g.Report,
      Customers: g.Customers,
      Folder: folder,
      ReportNotice: g.ReportNotice || '',
      formats,
    };
  });
}

/**
 * Build the cards for one event tab from the raw insight rows. Each row whose
 * `column` cell is non-empty is in the event; the cell holds one or more event
 * company names (multiple `;`-separated when several companies share one page,
 * e.g. "EY; EY Studio+"), and EACH name becomes its own card linking to that
 * row's page. This intentionally does NOT collapse by website: the same company
 * may sit in several events, and co-located companies each keep a distinct card.
 * Cards are sorted by label so the A–Z grid groups them correctly.
 */
export function buildEventCompanies(rows, column) {
  const cards = [];
  for (const row of rows) {
    const cell = String(row[column] || '').trim();
    const names = cell ? cell.split(';').map((n) => n.trim()).filter(Boolean) : [];
    const base = {
      Report: row.Report,
      Customers: row.Customers,
      Folder: `${(row.Folder || '').replace(/\/+$/, '')}/`,
      ReportNotice: row['Report Notice'] || '',
      formats: [],
    };
    for (const name of names) cards.push({ ...base, Company: name });
  }
  return cards.sort((a, b) => a.Company.localeCompare(b.Company));
}

function buildModeToggle(onChange, eventModes) {
  const wrapper = document.createElement('div');
  wrapper.className = 'cp-mode-toggle';

  for (const { id, label } of [
    { id: 'accounts', label: 'Accounts' },
    { id: 'insights', label: 'Insight Reports' },
    { id: 'portal', label: 'Summit 26 Portal' },
    ...eventModes.map((e) => ({ id: e.id, label: e.label })),
  ]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cp-mode-btn';
    btn.dataset.mode = id;
    btn.textContent = label;
    if (id === 'accounts') btn.classList.add('cp-mode-btn--active');
    btn.addEventListener('click', () => {
      wrapper.querySelectorAll('.cp-mode-btn').forEach((b) => b.classList.remove('cp-mode-btn--active'));
      btn.classList.add('cp-mode-btn--active');
      onChange(id);
    });
    wrapper.append(btn);
  }

  return wrapper;
}

function buildSearch() {
  const wrapper = document.createElement('div');
  wrapper.className = 'cp-search';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search insight reports…';
  input.className = 'cp-search-input';
  wrapper.append(input);

  return { wrapper, input };
}

function buildLetterNav(groups) {
  const nav = document.createElement('nav');
  nav.className = 'cp-letter-nav';
  nav.setAttribute('aria-label', 'Alphabetical navigation');

  for (const letter of LETTERS) {
    const btn = document.createElement('a');
    btn.className = 'cp-letter-btn';
    btn.textContent = letter;
    btn.href = `#cp-group-${letter}`;

    if (!groups.has(letter)) {
      btn.classList.add('cp-letter-disabled');
      btn.removeAttribute('href');
    } else {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(`cp-group-${letter}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    nav.append(btn);
  }

  return nav;
}

function buildDialog() {
  const backdrop = document.createElement('div');
  backdrop.className = 'cp-dialog-backdrop';
  backdrop.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'cp-dialog';

  const close = document.createElement('button');
  close.className = 'cp-dialog-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close details');
  close.innerHTML = '&times;';

  const content = document.createElement('div');
  content.className = 'cp-dialog-content';

  dialog.append(close, content);
  backdrop.append(dialog);
  document.body.append(backdrop);

  return { backdrop, close, content };
}

/** Turn a company.Folder value into a same-origin path (strip origin + trailing slash).
 *  Used to build the da.live edit URL, which appends its own `/index`. */
function folderToPath(folder) {
  try {
    return new URL(folder).pathname.replace(/\/$/, '');
  } catch {
    return folder.replace(/\/$/, '');
  }
}

function renderDialog(content, company, websiteMap, domainMap, mode) {
  let html = `<h3 class="cp-dialog-title">${company.Company}</h3>`;

  // Data-limitation notice (only on report modes; the value comes from the
  // report's `Report Notice` cell). Tells the rep a section is missing because
  // of the data available for that domain, not a generation error.
  const notice = isReportMode(mode) ? REPORT_NOTICES[company.ReportNotice] : null;
  if (notice) {
    html += `<div class="cp-dialog-notice" role="note">
      <span class="cp-dialog-notice-icon" aria-hidden="true">ℹ️</span>
      <div class="cp-dialog-notice-text">
        <strong>${notice.title}</strong>
        <span>${notice.body}</span>
      </div>
    </div>`;
  }

  const isReport = isReportMode(mode);

  // The key into websiteMap/domainMap differs for report modes (keyed by the
  // customer name) vs. accounts/portal (keyed by company). Compute it once.
  const lookupKey = isReport ? (company.Customers || company.Company) : company.Company;
  const domains = domainMap.get(lookupKey) || [];

  if (mode === 'accounts') {
    if (company.AM) {
      html += `<div class="cp-dialog-section">
        <h4>Account Manager</h4>
        <ul class="cp-dialog-list">
          <li>${company.AM}</li>
        </ul>
      </div>`;
    }
    if (company.Folder) {
      const editUrl = `https://da.live/canvas#/aemsites/summit-portal${folderToPath(company.Folder)}/index`;
      html += `<div class="cp-dialog-actions">
        <a class="cp-dialog-cta" href="${company.Folder}" target="_blank" rel="noopener">Open account page &rarr;</a>
        <a class="cp-dialog-cta cp-dialog-cta--secondary" href="${editUrl}" target="_blank" rel="noopener">Edit page</a>
      </div>`;
    }
  } else {
    const websites = websiteMap.get(lookupKey) || [];

    if (websites.length) {
      html += `<div class="cp-dialog-section">
        <h4>Websites</h4>
        <ul class="cp-dialog-list">
          ${websites.map((w) => {
            const href = /^https?:\/\//i.test(w) ? w : `https://${w}`;
            return `<li><a href="${href}" target="_blank" rel="noopener">${w}</a></li>`;
          }).join('')}
        </ul>
      </div>`;
    }

    if (isReport && company.Customers) {
      html += `<div class="cp-dialog-section">
        <h4>Customer</h4>
        <ul class="cp-dialog-list">
          <li>${company.Customers}</li>
        </ul>
      </div>`;
    } else if (domains.length) {
      html += `<div class="cp-dialog-section">
        <h4>Email Domains</h4>
        <ul class="cp-dialog-list">
          ${domains.map((d) => `<li>${d}</li>`).join('')}
        </ul>
      </div>`;
    }

    if (isReport && company.formats && company.formats.length) {
      // One website can have several landing-page formats (Cannes, Summit, …).
      // Each format opens/edits/shares INDEPENDENTLY — sharing must target a
      // specific landing page, not the whole website folder. The Share button
      // toggles a per-format email form (wired up after innerHTML below).
      html += `<div class="cp-dialog-section">
        <h4>Available reports</h4>
        <div class="cp-format-list">
          ${company.formats.map((f, i) => {
            const editUrl = `https://da.live/canvas#/aemsites/summit-portal${folderToPath(f.folder)}/index`;
            return `<div class="cp-format" data-format-index="${i}">
              <div class="cp-format-row">
                <a class="cp-dialog-cta" href="${f.folder}" target="_blank" rel="noopener">${f.label} &rarr;</a>
                <a class="cp-dialog-cta cp-dialog-cta--secondary" href="${editUrl}" target="_blank" rel="noopener">Edit</a>
                <button type="button" class="cp-dialog-cta cp-dialog-cta--secondary cp-format-share-toggle" aria-expanded="false">Share</button>
              </div>
              <div class="cp-format-share" hidden></div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    } else if (company.Folder) {
      const ctaLabel = isReport ? 'Open insight report' : 'Open customer portal page';
      const editUrl = `https://da.live/canvas#/aemsites/summit-portal${folderToPath(company.Folder)}/index`;
      html += `<div class="cp-dialog-actions">
        <a class="cp-dialog-cta" href="${company.Folder}" target="_blank" rel="noopener">${ctaLabel} &rarr;</a>
        <a class="cp-dialog-cta cp-dialog-cta--secondary" href="${editUrl}" target="_blank" rel="noopener">Edit page</a>
      </div>`;
    }
  }

  content.innerHTML = html;

  // Insight reports: share PER FORMAT. Each "Share" button toggles a share form
  // bound to that format's specific page (lazily built on first open).
  if (isReport && company.formats && company.formats.length) {
    content.querySelectorAll('.cp-format').forEach((row) => {
      const fmt = company.formats[Number(row.dataset.formatIndex)];
      const toggle = row.querySelector('.cp-format-share-toggle');
      const slot = row.querySelector('.cp-format-share');
      if (!fmt || !toggle || !slot) return;
      toggle.addEventListener('click', () => {
        if (!slot.firstChild) slot.append(buildShareForm(folderToDeepLink(fmt.folder)));
        const open = slot.hidden;
        slot.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        if (open) slot.querySelector('.cp-share-input')?.focus();
      });
    });
  } else if (mode !== 'accounts') {
    // Single shared page (portal mode): one share form for the page.
    // The internal accounts directory is never shareable.
    const shareSection = buildShareSection(company);
    if (shareSection) content.append(shareSection);
  }
}

function buildCard(company, onOpen) {
  const card = document.createElement('button');
  card.className = 'cp-card';
  card.type = 'button';

  const name = document.createElement('span');
  name.className = 'cp-card-name';
  name.textContent = company.Company;
  card.append(name);

  const arrow = document.createElement('span');
  arrow.className = 'cp-card-arrow';
  arrow.textContent = '→';
  card.append(arrow);

  card.addEventListener('click', () => onOpen(card, company));
  return card;
}

/**
 * Build the "Recently viewed" band for a mode, or return null when there are no
 * resolvable recents. Stored entries are matched back to the live company list
 * by folder so the dialog opens with full, current data; stale entries (folder
 * no longer present) are dropped.
 */
function buildRecentBand(mode, companies, onOpen) {
  const byFolder = new Map(companies.map((c) => [c.Folder, c]));
  const resolved = readRecent(mode)
    .map((e) => byFolder.get(e.folder))
    .filter(Boolean);
  if (!resolved.length) return null;

  const band = document.createElement('div');
  band.className = 'cp-recent';

  const heading = document.createElement('h2');
  heading.className = 'cp-recent-heading';
  heading.textContent = 'Recently viewed';
  band.append(heading);

  const cards = document.createElement('div');
  cards.className = 'cp-recent-cards';
  for (const company of resolved) {
    cards.append(buildCard(company, onOpen));
  }
  band.append(cards);
  return band;
}

function buildGrid(companies, onOpen) {
  const grouped = new Map();
  for (const c of companies) {
    const letter = getLetterGroup(c.Company);
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter).push(c);
  }

  const sortedGroups = new Map();
  for (const letter of LETTERS) {
    if (grouped.has(letter)) sortedGroups.set(letter, grouped.get(letter));
  }

  const grid = document.createElement('div');
  grid.className = 'cp-grid';

  for (const [letter, items] of sortedGroups) {
    const section = document.createElement('div');
    section.className = 'cp-group';
    section.id = `cp-group-${letter}`;

    const heading = document.createElement('h2');
    heading.className = 'cp-group-heading';
    heading.textContent = letter;
    section.append(heading);

    const cards = document.createElement('div');
    cards.className = 'cp-cards';
    for (const company of items) {
      cards.append(buildCard(company, onOpen));
    }
    section.append(cards);
    grid.append(section);
  }

  return { grid, groups: sortedGroups };
}

function applyFilter(container, query) {
  const q = query.toLowerCase().trim();
  const groups = container.querySelectorAll('.cp-group');

  for (const group of groups) {
    const cards = group.querySelectorAll('.cp-card');
    let visibleCount = 0;

    for (const card of cards) {
      const name = card.querySelector('.cp-card-name').textContent.toLowerCase();
      const match = !q || name.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visibleCount += 1;
    }

    group.style.display = visibleCount > 0 ? '' : 'none';
  }
}

function buildLookupMaps(companyData, cugData) {
  const websiteMap = new Map();
  (companyData?.data || []).forEach((row) => {
    const company = row.Company;
    const raw = row.Domains;
    if (company && raw) {
      const sites = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      if (sites.length) websiteMap.set(company, sites);
    }
  });

  const cugByPath = new Map();
  (cugData?.data || []).forEach((row) => {
    const path = row.url?.replace(/\*+$/, '').replace(/\/$/, '');
    const groups = row['cug-groups'];
    if (path && groups) cugByPath.set(path, groups);
  });

  const domainMap = new Map();
  (companyData?.data || []).forEach((row) => {
    const company = row.Company;
    const folder = row.Folder?.replace(/\/$/, '');
    if (!company || !folder) return;
    const raw = cugByPath.get(folder);
    if (!raw) return;
    const domains = raw.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
    if (domains.length) domainMap.set(company, domains);
  });

  return { websiteMap, domainMap };
}

const SEARCH_PLACEHOLDERS = {
  insights: 'Search insight reports…',
  accounts: 'Search accounts…',
  portal: 'Search customers…',
};

export default async function init(el) {
  const link = el.querySelector('a[href$=".json"]');
  if (!link) return;

  const { origin } = new URL(link.href);
  const insightsUrl = `${origin}/data/insights-list.json`;
  const accountsUrl = `${origin}/data/account-list.json`;
  const companyUrl = `${origin}/data/company-list.json`;
  const eventTabsUrl = `${origin}/data/event-tabs.json`;
  const cugUrl = `${origin}/closed-user-groups.json`;

  const [
    portalResp, insightsResp, accountsResp, companyResp, eventTabsResp, cugResp,
  ] = await Promise.all([
    fetch(link.href),
    fetch(insightsUrl),
    fetch(accountsUrl),
    fetch(companyUrl),
    fetch(eventTabsUrl).catch(() => null),
    fetch(cugUrl),
  ]);
  if (!portalResp.ok) return;

  const portalCompanies = (await portalResp.json()).data || [];
  const insightRows = insightsResp.ok ? ((await insightsResp.json()).data || []) : [];
  // Insight reports: one row per website×variant in the sheet → collapse to one
  // card per website, each carrying its available landing-page formats.
  const insightsCompanies = groupInsightsByWebsite(insightRows);
  // Which event tabs exist is authored in /data/event-tabs.json — no code change
  // per event. A missing/broken sheet falls back to deriving tabs from the
  // insights-list columns, so the tabs never vanish. See parseEventModes.
  const eventTabRows = eventTabsResp && eventTabsResp.ok
    ? ((await eventTabsResp.json().catch(() => ({}))).data || [])
    : [];
  const eventModes = parseEventModes(eventTabRows, insightRows);
  EVENT_MODE_IDS.clear();
  eventModes.forEach((e) => EVENT_MODE_IDS.add(e.id));
  // Event portal tabs build directly from the flagged rows (one card per row),
  // independent of the website grouping above — see buildEventCompanies.
  const eventCompanies = Object.fromEntries(
    eventModes.map((e) => [e.id, buildEventCompanies(insightRows, e.column)]),
  );
  const accountsCompanies = accountsResp.ok
    ? (await accountsResp.json()).data.map((r) => ({ ...r, Company: r.Account }))
    : [];
  const companyData = companyResp.ok ? await companyResp.json() : null;
  const cugData = cugResp.ok ? await cugResp.json() : null;

  const { websiteMap, domainMap } = buildLookupMaps(companyData, cugData);

  el.textContent = '';

  const { backdrop, close, content: dialogContent } = buildDialog();
  let activeCard = null;
  let currentMode = 'insights';

  function closeDialog() {
    backdrop.hidden = true;
    if (activeCard) {
      activeCard.classList.remove('cp-card--active');
      activeCard.focus();
      activeCard = null;
    }
  }

  function openDialog(card, company) {
    if (activeCard) activeCard.classList.remove('cp-card--active');
    activeCard = card;
    card.classList.add('cp-card--active');
    renderDialog(dialogContent, company, websiteMap, domainMap, currentMode);
    backdrop.hidden = false;
    close.focus();
    pushRecent(currentMode, company);
  }

  close.addEventListener('click', closeDialog);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeDialog(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !backdrop.hidden) closeDialog(); });

  const { wrapper: searchWrapper, input: searchInput } = buildSearch();
  const navContainer = document.createElement('div');
  const gridContainer = document.createElement('div');

  function renderMode(mode) {
    currentMode = mode;
    closeDialog();
    const companiesMap = {
      insights: insightsCompanies,
      accounts: accountsCompanies,
      portal: portalCompanies,
      ...eventCompanies,
    };
    const companies = companiesMap[mode] || [];
    searchInput.value = '';
    const event = eventModes.find((e) => e.id === mode);
    searchInput.placeholder = SEARCH_PLACEHOLDERS[mode]
      || (event ? `Search ${event.label}…` : 'Search…');

    const { grid, groups } = buildGrid(companies, openDialog);
    const letterNav = buildLetterNav(groups);

    const recentBand = buildRecentBand(mode, companies, openDialog);
    if (recentBand) navContainer.replaceChildren(recentBand, letterNav);
    else navContainer.replaceChildren(letterNav);
    gridContainer.replaceChildren(grid);
  }

  const modeToggle = buildModeToggle(renderMode, eventModes);
  el.append(modeToggle, searchWrapper, navContainer, gridContainer);
  renderMode('accounts');

  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    const grid = gridContainer.querySelector('.cp-grid');
    debounce = setTimeout(() => applyFilter(grid, searchInput.value), 120);
  });
}
