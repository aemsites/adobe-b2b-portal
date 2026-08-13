/*
 * Contact CTA Block
 * Left: red CTA card (eyebrow, heading, description, up to two buttons with icons).
 * Right: contact directory — eyebrow + heading, then hairline-separated rows of
 * icon tile / name / detail, each with an auto "Send Email" button (mailto).
 * Authoring rows:
 *   Row 1  (CTA):     eyebrow | heading | description | cell with 1-2 links
 *   Row 2  (aside):   eyebrow | heading        (or a single heading cell)
 *   Row 3+ (contact): icon | name | detail     (icon: user|team|briefcase|image|initials)
 * Button icons and the per-contact mailto are derived (link text / email in detail).
 */
const ICONS = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H13A1.5 1.5 0 0 1 14.5 6.5V10A1.5 1.5 0 0 1 13 11.5H8L5 14v-2.5H4.5A1.5 1.5 0 0 1 3 10z"/><path d="M9.5 14.2v.3A1.5 1.5 0 0 0 11 16h5l3 2.5V16h.5A1.5 1.5 0 0 0 21 14.5V11a1.5 1.5 0 0 0-1.5-1.5H18"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19.5h14"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5l11 6.5-11 6.5z"/></svg>',
};

function iconEl(name, className) {
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = ICONS[name] || '';
  return span;
}

function unwrap(cell) {
  return cell.children.length === 1 && cell.firstElementChild?.tagName === 'P'
    ? cell.firstElementChild.innerHTML
    : cell.innerHTML;
}

export function buttonIcon(text) {
  const t = text.toLowerCase();
  if (/download|report|pdf|deck/.test(t)) return 'download';
  if (/schedul|meet|book|call|talk|session|walkthrough|demo/.test(t)) return 'calendar';
  return '';
}

export function emailFrom(cell) {
  const link = cell?.querySelector('a[href^="mailto:"]');
  if (link) return link.getAttribute('href').replace(/^mailto:/i, '');
  const match = cell?.textContent.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0] : '';
}

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
      if (link.target) a.target = link.target;
      const label = document.createElement('span');
      label.textContent = link.textContent.trim();
      a.append(label);
      const ic = buttonIcon(link.textContent);
      if (ic) a.append(iconEl(ic, 'cc-btn-icon'));
      actions.append(a);
    });
    card.append(actions);
  }
  return card;
}

function buildContact(cells) {
  const row = document.createElement('div');
  row.className = 'cc-contact';

  const iconCell = cells[0];
  const iconKey = (iconCell?.textContent.trim() || '').toLowerCase();
  const name = cells[1]?.textContent.trim() || '';
  const detailCell = cells[2];

  const tile = document.createElement('span');
  tile.className = 'cc-tile';
  const img = iconCell?.querySelector('picture, img');
  if (img) {
    tile.append(img);
  } else if (ICONS[iconKey]) {
    tile.append(iconEl(iconKey, 'cc-tile-icon'));
  } else if (iconCell?.textContent.trim()) {
    tile.classList.add('cc-tile-initials');
    tile.textContent = iconCell.textContent.trim();
  }
  row.append(tile);

  const body = document.createElement('div');
  body.className = 'cc-contact-body';
  const nm = document.createElement('span');
  nm.className = 'cc-name';
  nm.textContent = name;
  body.append(nm);
  if (detailCell && detailCell.textContent.trim()) {
    const d = document.createElement('span');
    d.className = 'cc-detail';
    d.innerHTML = unwrap(detailCell);
    body.append(d);
  }
  row.append(body);

  const email = emailFrom(detailCell);
  if (email) {
    const send = document.createElement('a');
    send.className = 'cc-send';
    send.href = `mailto:${email}`;
    const label = document.createElement('span');
    label.textContent = 'Send Email';
    send.append(label, iconEl('send', 'cc-send-icon'));
    row.append(send);
  }
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
    const asideCells = [...rows[1].children];
    const eyebrow = asideCells.length >= 2 ? asideCells[0].textContent.trim() : '';
    const heading = (asideCells.length >= 2 ? asideCells[1] : asideCells[0])?.textContent.trim() || '';
    if (eyebrow) {
      const e = document.createElement('span');
      e.className = 'cc-eyebrow';
      e.textContent = eyebrow;
      aside.append(e);
    }
    if (heading) {
      const title = document.createElement('h3');
      title.className = 'cc-aside-title';
      title.textContent = heading;
      aside.append(title);
    }
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
