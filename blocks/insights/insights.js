/*
 * Insights (blindspots) Block
 * Light stat/insight cards: tone-driven pill badge (icon + label) + big number
 * with a sized unit + bold sub-label + body + optional source link.
 * Authoring — one row per card:
 *   flag | bignum | sub | body | tone | source
 * - flag:   badge label (e.g. "Blindspot" / "Trend" / "Benchmark")
 * - tone:   warn | trend | benchmark — drives the badge colour and its icon.
 * - bignum: the number is shown large; trailing/interior units and connector
 *           words ("%", "s", " of ") render smaller automatically.
 * - body:   keeps inline emphasis — authored <strong>/<b> renders in the accent
 *           "delta" colour; a sole wrapping <p> is unwrapped.
 * - source: optional; rendered as a "Source: <link>" footnote.
 */
const TONES = ['warn', 'trend', 'benchmark'];

/** Unwrap a sole wrapping <p> so we never nest <p> inside <p>. */
function innerOf(cell) {
  return cell.children.length === 1 && cell.firstElementChild?.tagName === 'P'
    ? cell.firstElementChild.innerHTML
    : cell.innerHTML;
}

/** Big number with smaller units: split off runs that carry no digits. */
export function renderNumber(str) {
  const num = document.createElement('div');
  num.className = 'ins-num';
  str.split(/([^\d.+-]+)/).forEach((part) => {
    if (!part) return;
    if (/[^\d.+-]/.test(part)) {
      const unit = document.createElement('span');
      unit.className = 'ins-num-unit';
      unit.textContent = part;
      num.append(unit);
    } else {
      num.append(document.createTextNode(part));
    }
  });
  return num;
}

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
    const sourceCell = cells[5];

    if (!num && !flag) return;

    const toneClass = TONES.includes(tone) ? ` ${tone}` : '';
    const card = document.createElement('div');
    card.className = `ins-card${toneClass}`;

    const head = document.createElement('div');
    head.className = 'ins-head';

    if (flag) {
      const badge = document.createElement('span');
      badge.className = 'ins-badge';
      const icon = document.createElement('span');
      icon.className = 'ins-badge-icon';
      const label = document.createElement('span');
      label.textContent = flag;
      badge.append(icon, label);
      head.append(badge);
    }

    const numsub = document.createElement('div');
    numsub.className = 'ins-numsub';
    if (num) numsub.append(renderNumber(num));
    if (sub) {
      const s = document.createElement('div');
      s.className = 'ins-sub';
      s.textContent = sub;
      numsub.append(s);
    }
    head.append(numsub);
    card.append(head);

    if (bodyCell && bodyCell.textContent.trim()) {
      const b = document.createElement('p');
      b.className = 'ins-body';
      b.innerHTML = innerOf(bodyCell);
      card.append(b);
    }

    if (sourceCell && sourceCell.textContent.trim()) {
      const src = document.createElement('p');
      src.className = 'ins-source';
      const inner = innerOf(sourceCell);
      src.innerHTML = /^\s*source\s*:/i.test(sourceCell.textContent) ? inner : `Source: ${inner}`;
      card.append(src);
    }

    grid.append(card);
  });

  el.textContent = '';
  el.append(grid);
}
