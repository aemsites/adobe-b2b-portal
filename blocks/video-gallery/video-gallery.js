/*
 * Video Gallery Block
 * Section header (eyebrow + heading + subhead) + a featured video (first video
 * row) and a list of smaller videos (remaining rows).
 * Authoring:
 *   Optional first row = header:  eyebrow | heading | subhead
 *   Then one row per video:       [link (+ optional image)] | eyebrow | title
 * The header row is detected as the first row whose first cell has no <a>/<picture>.
 * The first cell of a video row holds an <a href> to a YouTube / Vimeo / MP4 URL
 * and may include a poster image. Clicking the media swaps it for an inline embed;
 * an unrecognised URL opens in a new tab.
 */
export function videoSource(href) {
  if (/youtu\.?be/i.test(href)) return 'youtube';
  if (/vimeo/i.test(href)) return 'vimeo';
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(href)) return 'file';
  return '';
}

export function youtubeId(href) {
  try {
    const url = new URL(href);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    return url.searchParams.get('v') || url.pathname.split('/').pop();
  } catch {
    return '';
  }
}

function buildEmbed(href, source) {
  const wrap = document.createElement('div');
  wrap.className = 'vg-embed';
  if (source === 'youtube') {
    const id = youtubeId(href);
    wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" `
      + 'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>';
  } else if (source === 'vimeo') {
    const id = href.split('/').filter(Boolean).pop();
    wrap.innerHTML = `<iframe src="https://player.vimeo.com/video/${id}?autoplay=1" `
      + 'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>';
  } else {
    wrap.innerHTML = `<video src="${href}" controls autoplay playsinline></video>`;
  }
  return wrap;
}

function buildItem(cells, featured) {
  const linkCell = cells[0];
  const anchor = linkCell?.querySelector('a');
  const href = anchor?.href || '';
  const pic = linkCell?.querySelector('picture');
  const eyebrow = cells[1]?.textContent.trim() || '';
  const title = cells[2]?.textContent.trim() || anchor?.textContent.trim() || '';

  const item = document.createElement('div');
  item.className = `vg-item${featured ? ' vg-featured' : ''}`;

  const media = document.createElement('button');
  media.type = 'button';
  media.className = 'vg-media';
  media.setAttribute('aria-label', title ? `Play: ${title}` : 'Play video');
  if (pic) media.append(pic);

  media.addEventListener('click', () => {
    if (!href) return;
    const source = videoSource(href);
    if (source) media.replaceWith(buildEmbed(href, source));
    else window.open(href, '_blank', 'noopener');
  });
  item.append(media);

  const cap = document.createElement('div');
  cap.className = 'vg-cap';
  if (eyebrow) {
    const co = document.createElement('div');
    co.className = 'vg-co';
    co.textContent = eyebrow;
    cap.append(co);
  }
  if (title) {
    const h = document.createElement('h4');
    h.className = 'vg-title';
    h.textContent = title;
    cap.append(h);
  }
  item.append(cap);
  return item;
}

function buildHead(cells) {
  const head = document.createElement('div');
  head.className = 'vg-head';
  const [eyebrow, heading, subhead] = cells.map((c) => c?.textContent.trim() || '');
  if (eyebrow) {
    const e = document.createElement('div');
    e.className = 'vg-eyebrow';
    e.textContent = eyebrow;
    head.append(e);
  }
  if (heading) {
    const h = document.createElement('h2');
    h.className = 'vg-heading';
    h.textContent = heading;
    head.append(h);
  }
  if (subhead) {
    const s = document.createElement('p');
    s.className = 'vg-subhead';
    s.textContent = subhead;
    head.append(s);
  }
  return head;
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // Header row = first row that carries no link/poster (pure eyebrow|heading|subhead).
  let head = null;
  if (!rows[0].querySelector('a') && !rows[0].querySelector('picture')) {
    head = buildHead([...rows.shift().children]);
  }

  el.textContent = '';
  if (head) el.append(head);

  if (rows.length) {
    const grid = document.createElement('div');
    grid.className = 'vg-grid';

    const [featuredRow, ...restRows] = rows;
    grid.append(buildItem([...featuredRow.children], true));

    if (restRows.length) {
      const list = document.createElement('div');
      list.className = 'vg-list';
      restRows.forEach((row) => list.append(buildItem([...row.children], false)));
      grid.append(list);
    }
    el.append(grid);
  }
}
