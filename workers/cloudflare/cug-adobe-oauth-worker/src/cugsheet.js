/**
 * Resolve a page's allowed CUG groups from the `closed-user-groups` SHEET
 * rather than from the origin's `x-aem-cug-groups` header.
 *
 * Why: the header is served from the AEM Config Service, which is only written
 * when a human clicks "Apply Page Access" in the DA tool (`tools/cug/cug.js`).
 * The sheet itself is appended and published automatically every time a report
 * is generated, so between two clicks every new account is invisible to the
 * edge: its pages fall through to the catch-all `/accounts**` row and appear to
 * allow only the staff domains. Customers then 403 on their own report, and
 * `/auth/sharelink` refuses to mint a link ("Page has no customer group to
 * share"). Reading the sheet directly removes that window entirely — a row is
 * live the moment DIH publishes it.
 *
 * The origin header still decides WHETHER a path is gated (`x-aem-cug-required`,
 * which comes from static rules like `/accounts**` that never go stale). The
 * sheet only decides WHICH domains are allowed, and only ever narrows to the
 * groups the sheet itself names. Any failure falls back to the header, so a bad
 * fetch can never open a page up.
 *
 * Matching mirrors what the DA tool would have pushed to the Config Service:
 *   - rows with no `cug-groups` produce no header, so they are skipped entirely
 *     (a row like `/accounts/r/redcross**` with blank groups falls through to
 *     the catch-all, exactly as it does today)
 *   - a trailing `*`/`**` makes the `url` a prefix glob; anything else is exact
 *   - the most specific (longest) matching row wins
 */

const SHEET_PATH = '/closed-user-groups.json';
// How long a successfully-fetched sheet is reused inside one isolate. Short
// enough that a newly published account goes live within minutes, long enough
// that the sheet is fetched once per isolate rather than per request.
const TTL_MS = 5 * 60 * 1000;
// Never let a slow origin hold up a page request — fall back to the header.
const FETCH_TIMEOUT_MS = 2000;
// Back-off after a failed refresh, so a broken origin isn't re-hit per request.
const ERROR_RETRY_MS = 60 * 1000;
// The sheet is served whole today (~4k rows). Page only if that ever changes.
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

// eslint-disable-next-line no-console
const log = (...args) => console.log('[cugsheet]', ...args);
// eslint-disable-next-line no-console
const logError = (...args) => console.error('[cugsheet]', ...args);

// Per-isolate cache. `entries` is kept on refresh failure (stale-if-error): a
// transient origin blip must not silently drop every customer back to the
// staff-only header groups, which would 403 customers on their own pages.
let cache = { entries: null, expires: 0 };
let inFlight = null;

/** Reset the module cache — tests only. */
export function resetCugSheetCache() {
  cache = { entries: null, expires: 0 };
  inFlight = null;
}

/**
 * Turn raw sheet rows into match entries, most specific first.
 * Exported for tests; `matchSheetGroups` is the only consumer.
 */
export function parseCugSheetRows(rows) {
  const entries = [];
  for (const row of rows) {
    const url = typeof row?.url === 'string' ? row.url.trim() : '';
    const groups = String(row?.['cug-groups'] || '')
      .split(',')
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean);
    // Keep only rows the DA tool would also turn into a header: a real path,
    // and at least one group. A row naming no groups emits no
    // `x-aem-cug-groups`, so it must not shadow a broader row that does.
    if (url.startsWith('/') && groups.length) {
      entries.push({
        prefix: url.replace(/\*+$/, ''),
        glob: url.endsWith('*'),
        groups,
      });
    }
  }
  entries.sort((a, b) => b.prefix.length - a.prefix.length);
  return entries;
}

/** Most-specific matching row's groups for `path`, or null when none match. */
export function matchSheetGroups(entries, path) {
  if (!entries || !path) return null;
  const clean = path.split('?')[0];
  const match = entries.find(
    (e) => (e.glob ? clean.startsWith(e.prefix) : clean === e.prefix),
  );
  return match ? match.groups : null;
}

/** Fetch the sheet from the origin, following pagination if it ever appears. */
async function fetchSheetRows(env) {
  const headers = {};
  if (env.ORIGIN_AUTHENTICATION) headers.authorization = `token ${env.ORIGIN_AUTHENTICATION}`;
  const base = `https://${env.ORIGIN_HOSTNAME}${SHEET_PATH}`;
  const rows = [];
  let url = base;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const resp = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!resp.ok) throw new Error(`sheet fetch failed (${resp.status})`);
    const json = await resp.json();
    const data = Array.isArray(json.data) ? json.data : [];
    rows.push(...data);
    const total = Number(json.total) || rows.length;
    if (rows.length >= total || data.length === 0) break;
    url = `${base}?offset=${rows.length}&limit=${PAGE_SIZE}`;
  }

  return rows;
}

/** Load the sheet, honouring the cache. Never throws; returns null on failure. */
async function loadEntries(env) {
  const now = Date.now();
  if (cache.entries && now < cache.expires) return cache.entries;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const rows = await fetchSheetRows(env);
      const entries = parseCugSheetRows(rows);
      cache = { entries, expires: Date.now() + TTL_MS };
      log(`sheet loaded rows=${rows.length} entries=${entries.length}`);
      return entries;
    } catch (err) {
      logError(`sheet fetch failed: ${err.message}`);
      // Keep serving the last good copy rather than falling back to the
      // (staff-only) header groups and locking customers out.
      cache = { entries: cache.entries, expires: Date.now() + ERROR_RETRY_MS };
      return cache.entries;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * The groups the sheet allows for `path`, or null when the sheet is
 * unavailable or names no groups for it (caller falls back to the header).
 */
export async function cugSheetGroups(path, env) {
  try {
    const entries = await loadEntries(env);
    return matchSheetGroups(entries, path);
  } catch (err) {
    // Belt and braces: this path gates every request, so it must never throw.
    logError(`group resolution failed for path=${path}: ${err.message}`);
    return null;
  }
}
