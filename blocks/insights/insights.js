/*
 * Insights (blindspots) Block
 * Dark stat/insight cards: category flag + big number + sub-label + body.
 * Authoring — one row per card:
 *   flag | bignum | sub | body | tone (optional: warn | trend | benchmark)
 * The body cell keeps inline emphasis (authored <strong>/<b> renders as the
 * accent "delta" colour).
 */
const TONES = ['warn', 'trend', 'benchmark'];

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];

  const grid = document.createElement('div');
  grid.className = 'ins-grid';

  rows.forEach((row) => {
    const cells = [...row.children];
    const flag = cells[0]?.textContent.trim() || '';
    const num = cells[1]?.textContent.trim() || '';
    const sub = cells[2]?.textContent.trim() || '';
    const bodyCell = cells[3];
    const tone = (cells[4]?.textContent.trim() || '').toLowerCase();

    if (!num && !flag) return;

    const toneClass = TONES.includes(tone) ? ` ${tone}` : '';
    const card = document.createElement('div');
    card.className = `ins-card${toneClass}`;

    const f = document.createElement('div');
    f.className = 'ins-flag';
    f.textContent = flag;

    const n = document.createElement('div');
    n.className = 'ins-num';
    n.textContent = num;

    const s = document.createElement('div');
    s.className = 'ins-sub';
    s.textContent = sub;

    card.append(f, n, s);

    if (bodyCell && bodyCell.textContent.trim()) {
      const b = document.createElement('p');
      b.className = 'ins-body';
      // Unwrap a sole authored <p> so we don't nest <p> inside <p>.
      b.innerHTML = bodyCell.children.length === 1
        && bodyCell.firstElementChild?.tagName === 'P'
        ? bodyCell.firstElementChild.innerHTML
        : bodyCell.innerHTML;
      card.append(b);
    }

    grid.append(card);
  });

  el.textContent = '';
  el.append(grid);
}
