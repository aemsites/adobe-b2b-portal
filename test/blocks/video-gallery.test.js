import { expect } from '@esm-bundle/chai';
import { videoSource, youtubeId } from '../../blocks/video-gallery/video-gallery.js';

describe('video-gallery › videoSource', () => {
  it('detects YouTube, Vimeo and file sources', () => {
    expect(videoSource('https://youtu.be/abc')).to.equal('youtube');
    expect(videoSource('https://www.youtube.com/watch?v=abc')).to.equal('youtube');
    expect(videoSource('https://vimeo.com/123')).to.equal('vimeo');
    expect(videoSource('https://cdn.example.com/clip.mp4')).to.equal('file');
    expect(videoSource('https://cdn.example.com/clip.webm')).to.equal('file');
  });

  it('returns empty for an unrecognised URL', () => {
    expect(videoSource('https://example.com/page')).to.equal('');
  });
});

describe('video-gallery › youtubeId', () => {
  it('reads the id from a youtu.be short link', () => {
    expect(youtubeId('https://youtu.be/abc123')).to.equal('abc123');
  });

  it('reads the id from a watch?v= link', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=xyz789')).to.equal('xyz789');
  });

  it('returns empty for an invalid URL', () => {
    expect(youtubeId('not a url')).to.equal('');
  });
});
