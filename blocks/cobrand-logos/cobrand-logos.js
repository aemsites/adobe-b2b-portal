/*
 * Co-branded Logos Block
 * A horizontal logo lockup — Adobe × one-or-more partner / customer brands,
 * separated by "×" dividers. The Adobe mark (bundled SVG) is prepended
 * automatically unless the block carries the `no-adobe` variant.
 *
 * Authoring — one row per partner brand (rendered left→right after Adobe):
 *   logo | name | link | color
 *   - logo:  an authored image (the customer's logo) OR short text initials
 *            for a fallback tile (e.g. "M").
 *   - name:  brand name — used as the image alt / tile aria-label.
 *   - link:  optional URL; wraps that brand's mark in a link.
 *   - color: optional hex; tints the fallback initials tile only (ignored
 *            when a real logo image is authored).
 *
 * Variants: `center` (center the lockup, e.g. in a footer), `no-adobe`
 * (do not auto-prepend the Adobe mark — author every brand yourself).
 */
const ADOBE_LOGO = '/img/icons/adobe-logo.svg';

function makeDivider() {
  const d = document.createElement('span');
  d.className = 'cbl-x';
  d.setAttribute('aria-hidden', 'true');
  d.textContent = '×';
  return d;
}

function wrap(mark, link) {
  if (link) {
    const a = document.createElement('a');
    a.className = 'cbl-brand';
    a.href = link;
    if (/^https?:/i.test(link)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    a.append(mark);
    return a;
  }
  const span = document.createElement('span');
  span.className = 'cbl-brand';
  span.append(mark);
  return span;
}

function makeAdobe() {
  const img = document.createElement('img');
  img.className = 'cbl-logo cbl-adobe';
  img.src = ADOBE_LOGO;
  img.alt = 'Adobe';
  return wrap(img, '');
}

function makeBrand(cells) {
  const logoCell = cells[0];
  const name = cells[1]?.textContent.trim() || '';
  const link = cells[2]?.querySelector('a')?.href || cells[2]?.textContent.trim() || '';
  const color = cells[3]?.textContent.trim() || '';
  const pic = logoCell?.querySelector('picture') || logoCell?.querySelector('img');

  let mark;
  if (pic) {
    mark = pic;
    mark.classList.add('cbl-logo');
    const img = pic.tagName === 'IMG' ? pic : pic.querySelector('img');
    if (img && name && !img.alt) img.alt = name;
  } else {
    mark = document.createElement('span');
    mark.className = 'cbl-tile';
    mark.textContent = (logoCell?.textContent.trim() || name.charAt(0)).slice(0, 3);
    if (color) mark.style.background = color;
    if (name) mark.setAttribute('aria-label', name);
  }

  return wrap(mark, link);
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const row = document.createElement('div');
  row.className = 'cbl-row';

  const marks = [];
  if (!el.classList.contains('no-adobe')) marks.push(makeAdobe());

  rows.forEach((r) => {
    const cells = [...r.children];
    const hasContent = cells.some((c) => c.textContent.trim() || c.querySelector('img, picture'));
    if (!hasContent) return;
    marks.push(makeBrand(cells));
  });

  marks.forEach((m, i) => {
    if (i > 0) row.append(makeDivider());
    row.append(m);
  });

  el.textContent = '';
  el.append(row);
}
