/*
 * Contact CTA Block
 * Left: red CTA card (eyebrow, heading, description, up to two buttons).
 * Right: contact directory (heading + rows of initials / name / detail).
 * Authoring rows:
 *   Row 1  (CTA):     eyebrow | heading | description | cell with 1-2 links
 *   Row 2  (aside):   aside heading (single cell)
 *   Row 3+ (contact): initials | name | detail (detail may contain a link)
 */
function buildCtaCard(cells) {
  const card = document.createElement('div');
  card.className = 'cc-card';

  const eyebrow = cells[0]?.textContent.trim() || '';
  const heading = cells[1]?.textContent.trim() || '';
  const desc = cells[2]?.textContent.trim() || '';
  const links = cells[3] ? [...cells[3].querySelectorAll('a')] : [];

  if (eyebrow) {
    const e = document.createElement('span');
    e.className = 'cc-eyebrow';
    e.textContent = eyebrow;
    card.append(e);
  }
  if (heading) {
    const h = document.createElement('h3');
    h.className = 'cc-title';
    h.textContent = heading;
    card.append(h);
  }
  if (desc) {
    const p = document.createElement('p');
    p.className = 'cc-desc';
    p.textContent = desc;
    card.append(p);
  }
  if (links.length) {
    const actions = document.createElement('div');
    actions.className = 'cc-actions';
    links.forEach((link, i) => {
      const a = document.createElement('a');
      a.className = `cc-btn ${i === 0 ? 'solid' : 'ghost'}`;
      a.href = link.href;
      a.textContent = link.textContent.trim();
      if (link.target) a.target = link.target;
      actions.append(a);
    });
    card.append(actions);
  }
  return card;
}

function buildContact(cells) {
  const row = document.createElement('div');
  row.className = 'cc-contact';

  const initials = cells[0]?.textContent.trim() || '';
  const name = cells[1]?.textContent.trim() || '';
  const detailCell = cells[2];

  const av = document.createElement('span');
  av.className = 'cc-avatar';
  av.textContent = initials;
  row.append(av);

  const body = document.createElement('div');
  const nm = document.createElement('b');
  nm.className = 'cc-name';
  nm.textContent = name;
  body.append(nm);

  if (detailCell && detailCell.textContent.trim()) {
    const d = document.createElement('span');
    d.className = 'cc-detail';
    // Unwrap a sole authored <p> so we don't nest block markup oddly.
    d.innerHTML = detailCell.children.length === 1
      && detailCell.firstElementChild?.tagName === 'P'
      ? detailCell.firstElementChild.innerHTML
      : detailCell.innerHTML;
    body.append(d);
  }

  row.append(body);
  return row;
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  const grid = document.createElement('div');
  grid.className = 'cc-grid';
  grid.append(buildCtaCard([...rows[0].children]));

  const aside = document.createElement('div');
  aside.className = 'cc-aside';

  if (rows[1]) {
    const title = document.createElement('h3');
    title.className = 'cc-aside-title';
    title.textContent = rows[1].textContent.trim();
    aside.append(title);
  }

  const contacts = rows.slice(2);
  if (contacts.length) {
    const list = document.createElement('div');
    list.className = 'cc-contacts';
    contacts.forEach((row) => list.append(buildContact([...row.children])));
    aside.append(list);
  }

  grid.append(aside);

  el.textContent = '';
  el.append(grid);
}
