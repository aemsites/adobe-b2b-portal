import { expect } from '@esm-bundle/chai';
import { buttonIcon, emailFrom } from '../../blocks/contact-cta/contact-cta.js';

function cell(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('contact-cta › buttonIcon', () => {
  it('picks download for report/download labels', () => {
    expect(buttonIcon('Download full report')).to.equal('download');
  });

  it('picks calendar for scheduling labels', () => {
    expect(buttonIcon('Schedule a meeting')).to.equal('calendar');
    expect(buttonIcon('Book a walkthrough')).to.equal('calendar');
  });

  it('returns empty for an unrelated label', () => {
    expect(buttonIcon('Learn more')).to.equal('');
  });
});

describe('contact-cta › emailFrom', () => {
  it('reads a mailto link href', () => {
    expect(emailFrom(cell('<a href="mailto:a@b.com">mail</a>'))).to.equal('a@b.com');
  });

  it('extracts an email from plain detail text', () => {
    expect(emailFrom(cell('Account Director · taneja@adobe.com'))).to.equal('taneja@adobe.com');
  });

  it('returns empty when there is no email', () => {
    expect(emailFrom(cell('Account Director'))).to.equal('');
  });
});
