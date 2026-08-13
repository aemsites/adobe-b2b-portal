import { expect } from '@esm-bundle/chai';
import { toneClass } from '../../blocks/product-cards/product-cards.js';

describe('product-cards › toneClass', () => {
  it('maps explicit tones', () => {
    expect(toneClass('positive', '')).to.equal('is-positive');
    expect(toneClass('notice', '')).to.equal('is-notice');
  });

  it('is case-insensitive on the tone', () => {
    expect(toneClass('POSITIVE', '')).to.equal('is-positive');
  });

  it('infers notice from a "Trial" state when tone is blank', () => {
    expect(toneClass('', 'Trial')).to.equal('is-notice');
    expect(toneClass('', 'trial (60 days)')).to.equal('is-notice');
  });

  it('defaults to positive for non-trial / empty state', () => {
    expect(toneClass('', 'Active')).to.equal('is-positive');
    expect(toneClass('', '')).to.equal('is-positive');
  });
});
