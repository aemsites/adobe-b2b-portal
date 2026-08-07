/*
 * Quote Block
 * Red banner with a blockquote and author (initials + name + role).
 * Authoring — single row: quote | initials | name | role
 */
export default function init(el) {
  const row = el.querySelector(':scope > div');
  const cells = row ? [...row.children] : [];
  const text = cells[0]?.textContent.trim() || '';
  const initials = cells[1]?.textContent.trim() || '';
  const name = cells[2]?.textContent.trim() || '';
  const role = cells[3]?.textContent.trim() || '';

  const banner = document.createElement('div');
  banner.className = 'q-banner';

  const bq = document.createElement('blockquote');
  bq.className = 'q-text';
  bq.textContent = text;
  banner.append(bq);

  if (name || initials) {
    const author = document.createElement('div');
    author.className = 'q-author';

    if (initials) {
      const av = document.createElement('span');
      av.className = 'q-avatar';
      av.textContent = initials;
      author.append(av);
    }

    const meta = document.createElement('div');
    meta.className = 'q-name';
    const b = document.createElement('b');
    b.textContent = name;
    meta.append(b);
    if (role) {
      const span = document.createElement('span');
      span.textContent = role;
      meta.append(span);
    }
    author.append(meta);
    banner.append(author);
  }

  el.textContent = '';
  el.append(banner);
}
