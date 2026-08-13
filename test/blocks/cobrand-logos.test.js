import { expect } from '@esm-bundle/chai';
import { takeCaption } from '../../blocks/cobrand-logos/cobrand-logos.js';

function row(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('cobrand-logos › takeCaption', () => {
  it('takes a trailing prose cell as the caption and removes it', () => {
    const rows = [row('<div>M</div>'), row('<div>Adobe × Amazon — confidential</div>')];
    const caption = takeCaption(rows);
    expect(caption).to.equal('Adobe × Amazon — confidential');
    expect(rows.length).to.equal(1);
  });

  it('does not treat a short initials tile as a caption', () => {
    const rows = [row('<div>M</div>')];
    expect(takeCaption(rows)).to.equal('');
    expect(rows.length).to.equal(1);
  });

  it('does not treat an image row as a caption', () => {
    const rows = [row('<div><img src="/logo.svg" alt="brand"></div>')];
    expect(takeCaption(rows)).to.equal('');
    expect(rows.length).to.equal(1);
  });
});
