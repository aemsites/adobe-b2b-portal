/*
 * Quote Block
 * Near-black centered testimonial banner: decorative quotation mark + quote +
 * centered author (name + role).
 * Authoring — single row: quote | name | role
 */
export default function init(el) {
  const row = el.querySelector(':scope > div');
  const cells = row ? [...row.children] : [];
  const text = cells[0]?.textContent.trim() || '';
  const name = cells[1]?.textContent.trim() || '';
  const role = cells[2]?.textContent.trim() || '';

  const banner = document.createElement('div');
  banner.className = 'q-banner';

  const line = document.createElement('div');
  line.className = 'q-line';
  const mark = document.createElement('span');
  mark.className = 'q-mark';
  mark.setAttribute('aria-hidden', 'true');
  const bq = document.createElement('blockquote');
  bq.className = 'q-text';
  bq.textContent = text;
  line.append(mark, bq);
  banner.append(line);

  if (name || role) {
    const author = document.createElement('div');
    author.className = 'q-author';
    if (name) {
      const n = document.createElement('div');
      n.className = 'q-name';
      n.textContent = name;
      author.append(n);
    }
    if (role) {
      const r = document.createElement('div');
      r.className = 'q-role';
      r.textContent = role;
      author.append(r);
    }
    banner.append(author);
  }

  el.textContent = '';
  el.append(banner);
}
