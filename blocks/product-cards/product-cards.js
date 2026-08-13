/*
 * Product Cards Block
 * Section header (eyebrow + heading + prev/next arrows) + intro line + a
 * horizontally-scrollable carousel of product cards.
 * Authoring:
 *   Optional first row = header:  eyebrow | heading | intro
 *   Then one row per product:     image | title | description | state | plan | tone
 * - image: authored thumbnail (56×56); header row is the one whose first cell
 *   holds no image.
 * - tone: positive | notice — tints the status dot and plan label. If omitted,
 *   a state starting with "Trial" is treated as notice, else positive.
 */
const TONES = { positive: 'is-positive', notice: 'is-notice' };

export function toneClass(tone, state) {
  const t = tone.toLowerCase();
  if (TONES[t]) return TONES[t];
  return /^\s*trial/i.test(state) ? TONES.notice : TONES.positive;
}

function arrowButton(dir) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `pc-arrow pc-arrow-${dir}`;
  b.setAttribute('aria-label', dir === 'prev' ? 'Previous products' : 'Next products');
  return b;
}

function buildCard(cells) {
  const pic = cells[0]?.querySelector('picture, img');
  const title = cells[1]?.textContent.trim() || '';
  const desc = cells[2]?.textContent.trim() || '';
  const state = cells[3]?.textContent.trim() || '';
  const plan = cells[4]?.textContent.trim() || '';
  const tone = cells[5]?.textContent.trim() || '';

  if (!title) return null;

  const card = document.createElement('div');
  card.className = 'pc-card';

  const cardHead = document.createElement('div');
  cardHead.className = 'pc-card-head';
  const thumb = document.createElement('div');
  thumb.className = 'pc-thumb';
  if (pic) thumb.append(pic);
  const h = document.createElement('h3');
  h.className = 'pc-title';
  h.textContent = title;
  cardHead.append(thumb, h);
  card.append(cardHead);

  if (desc) {
    const p = document.createElement('p');
    p.className = 'pc-desc';
    p.textContent = desc;
    card.append(p);
  }

  if (state || plan) {
    const st = document.createElement('div');
    st.className = `pc-status ${toneClass(tone, state)}`;
    const dot = document.createElement('span');
    dot.className = 'pc-dot';
    st.append(dot);
    if (state) {
      const s = document.createElement('span');
      s.className = 'pc-state';
      s.textContent = state;
      st.append(s);
    }
    if (plan) {
      const sep = document.createElement('span');
      sep.className = 'pc-sep';
      sep.textContent = '•';
      const pl = document.createElement('span');
      pl.className = 'pc-plan';
      pl.textContent = plan;
      st.append(sep, pl);
    }
    card.append(st);
  }

  return card;
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // Header row = first row whose first cell has no image.
  let headCells = null;
  if (!rows[0].querySelector('picture, img')) {
    headCells = [...rows.shift().children];
  }

  const track = document.createElement('div');
  track.className = 'pc-track';
  rows.forEach((row) => {
    const card = buildCard([...row.children]);
    if (card) track.append(card);
  });

  const viewport = document.createElement('div');
  viewport.className = 'pc-viewport';
  viewport.append(track);

  el.textContent = '';

  if (headCells) {
    const [eyebrow, heading, intro] = headCells.map((c) => c?.textContent.trim() || '');

    const head = document.createElement('div');
    head.className = 'pc-head';
    const text = document.createElement('div');
    text.className = 'pc-head-text';
    if (eyebrow) {
      const e = document.createElement('div');
      e.className = 'pc-eyebrow';
      e.textContent = eyebrow;
      text.append(e);
    }
    if (heading) {
      const h = document.createElement('h2');
      h.className = 'pc-heading';
      h.textContent = heading;
      text.append(h);
    }
    head.append(text);

    const nav = document.createElement('div');
    nav.className = 'pc-nav';
    const prev = arrowButton('prev');
    const next = arrowButton('next');
    nav.append(prev, next);
    head.append(nav);
    el.append(head);

    const scrollByCard = (delta) => {
      const card = track.querySelector('.pc-card');
      const step = card ? card.getBoundingClientRect().width + 24 : 320;
      viewport.scrollBy({ left: delta * step, behavior: 'smooth' });
    };
    prev.addEventListener('click', () => scrollByCard(-1));
    next.addEventListener('click', () => scrollByCard(1));

    if (intro) {
      const p = document.createElement('p');
      p.className = 'pc-intro';
      p.textContent = intro;
      el.append(p);
    }
  }

  el.append(viewport);
}
