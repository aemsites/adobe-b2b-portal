import { expect } from '@esm-bundle/chai';
import { renderNumber } from '../../blocks/insights/insights.js';

describe('insights › renderNumber', () => {
  it('wraps a middle connector word as a smaller unit', () => {
    const el = renderNumber('3 of 5');
    expect(el.textContent).to.equal('3 of 5');
    const units = el.querySelectorAll('.ins-num-unit');
    expect(units.length).to.equal(1);
    expect(units[0].textContent).to.equal(' of ');
  });

  it('wraps a trailing percent sign as a unit', () => {
    const el = renderNumber('+41%');
    const units = el.querySelectorAll('.ins-num-unit');
    expect(units.length).to.equal(1);
    expect(units[0].textContent).to.equal('%');
  });

  it('wraps a trailing letter unit', () => {
    const el = renderNumber('1.9s');
    expect(el.querySelector('.ins-num-unit').textContent).to.equal('s');
  });

  it('leaves a pure number with no unit spans', () => {
    const el = renderNumber('100');
    expect(el.querySelectorAll('.ins-num-unit').length).to.equal(0);
    expect(el.textContent).to.equal('100');
  });
});
