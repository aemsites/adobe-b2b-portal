/*
 * Video Gallery Block
 * Featured video (first row) + a list of smaller videos (remaining rows).
 * Authoring — one row per video:
 *   [link (+ optional image)] | eyebrow | title
 * The first cell holds an <a href> to a YouTube / Vimeo / MP4 URL and may
 * include a poster image. Clicking a poster swaps it for an inline embed;
 * an unrecognised URL opens in a new tab.
 */
function videoSource(href) {
  if (/youtu\.?be/i.test(href)) return 'youtube';
  if (/vimeo/i.test(href)) return 'vimeo';
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(href)) return 'file';
  return '';
}

function youtubeId(href) {
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

  const poster = document.createElement('button');
  poster.type = 'button';
  poster.className = 'vg-poster';
  poster.setAttribute('aria-label', title ? `Play: ${title}` : 'Play video');

  if (pic) poster.append(pic);

  const play = document.createElement('span');
  play.className = 'vg-play';
  play.setAttribute('aria-hidden', 'true');
  poster.append(play);

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
  poster.append(cap);

  poster.addEventListener('click', () => {
    if (!href) return;
    const source = videoSource(href);
    if (source) {
      poster.replaceWith(buildEmbed(href, source));
    } else {
      window.open(href, '_blank', 'noopener');
    }
  });

  item.append(poster);
  return item;
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (!rows.length) return;

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

  el.textContent = '';
  el.append(grid);
}
