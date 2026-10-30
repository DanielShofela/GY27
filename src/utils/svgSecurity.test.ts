import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAndValidateSvg, MAX_SVG_SIZE_BYTES } from './svgSecurity';

test('valid clean SVG passes validation and generates dataUri', () => {
  const cleanSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="40" fill="#FF6A00" />
      <text x="50" y="55" font-size="12" text-anchor="middle" fill="#FFFFFF">GLORIOUS</text>
    </svg>
  `;

  const result = sanitizeAndValidateSvg(cleanSvg, 250);
  assert.equal(result.isValid, true);
  assert.ok(result.dataUri);
  assert.ok(result.dataUri.startsWith('data:image/svg+xml;base64,'));
});

test('rejects files larger than 2MB', () => {
  const largeSize = MAX_SVG_SIZE_BYTES + 500;
  const dummySvg = '<svg></svg>';

  const result = sanitizeAndValidateSvg(dummySvg, largeSize);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'FILE_TOO_LARGE');
});

test('rejects SVG containing <script> tags', () => {
  const maliciousSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <script>alert("XSS")</script>
      <circle cx="50" cy="50" r="40" fill="red" />
    </svg>
  `;

  const result = sanitizeAndValidateSvg(maliciousSvg);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED');
});

test('rejects SVG with inline JavaScript event handlers (onload, onerror, onclick)', () => {
  const eventSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert(document.cookie)">
      <rect width="100" height="100" fill="blue" />
    </svg>
  `;

  const result = sanitizeAndValidateSvg(eventSvg);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED');
});

test('rejects SVG with javascript: pseudo-protocol', () => {
  const jsUriSvg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <a href="javascript:alert(1)">
        <text y="20">Click me</text>
      </a>
    </svg>
  `;

  const result = sanitizeAndValidateSvg(jsUriSvg);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED');
});

test('rejects SVG with foreignObject embedding', () => {
  const foreignSvg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="100" height="100">
        <body xmlns="http://www.w3.org/1999/xhtml">
          <div>Injected HTML</div>
        </body>
      </foreignObject>
    </svg>
  `;

  const result = sanitizeAndValidateSvg(foreignSvg);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED');
});

test('rejects non-SVG content or plain text files', () => {
  const textFile = 'This is just a text file claiming to be an image';
  const result = sanitizeAndValidateSvg(textFile);
  assert.equal(result.isValid, false);
  assert.equal(result.error, 'NOT_VALID_SVG');
});
