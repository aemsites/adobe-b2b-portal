/*
 * Product Cards Block
 * Grid of owned-product cards: icon tile + title + description + status pill.
 * Authoring — one row per product:
 *   iconLabel | title | description | status | iconColor (optional hex)
 * A status that starts with "Trial" renders amber; anything else renders
 * green (active).
 */
export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];

  const grid = document.createElement('div');
  grid.className = 'pc-grid';

  rows.forEach((row) => {
    const cells = [...row.children];
    const iconLabel = cells[0]?.textContent.trim() || '';
    const title = cells[1]?.textContent.trim() || '';
    const desc = cells[2]?.textContent.trim() || '';
    const status = cells[3]?.textContent.trim() || '';
    const iconColor = cells[4]?.textContent.trim() || '';

    if (!title && !iconLabel) return;

    const isTrial = /^\s*trial/i.test(status);
    const card = document.createElement('div');
    card.className = `pc-card${isTrial ? ' trial' : ''}`;

    const icon = document.createElement('div');
    icon.className = 'pc-icon';
    if (iconColor) icon.style.background = iconColor;
    icon.textContent = iconLabel;

    const h = document.createElement('h4');
    h.className = 'pc-title';
    h.textContent = title;

    const p = document.createElement('p');
    p.className = 'pc-desc';
    p.textContent = desc;

    const st = document.createElement('span');
    st.className = 'pc-status';
    st.textContent = status;

    card.append(icon, h, p, st);
    grid.append(card);
  });

  el.textContent = '';
  el.append(grid);
}
