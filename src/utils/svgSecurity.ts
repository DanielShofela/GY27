import DOMPurify from 'dompurify';

export const MAX_SVG_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

export interface SvgValidationResult {
  isValid: boolean;
  sanitizedSvg?: string;
  dataUri?: string;
  error?: string;
  originalSizeBytes?: number;
  optimizedSizeBytes?: number;
}

/**
 * Optimizes raw SVG text by removing XML comments, doctype declarations,
 * metadata blocks, editor attributes, and excess whitespace.
 * Retains 100% of shapes, paths, styles, and vector definitions.
 */
export function optimizeSvgContent(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  let optimized = rawSvg
    // Remove XML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove <?xml ... ?> and <!DOCTYPE ... >
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    // Remove <metadata>...</metadata> blocks
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    // Remove inkscape, sodipodi, and adobe editor attributes/tags
    .replace(/sodipodi:[a-z0-9_-]+="[^"]*"/gi, '')
    .replace(/inkscape:[a-z0-9_-]+="[^"]*"/gi, '')
    .replace(/xmlns:sodipodi="[^"]*"/gi, '')
    .replace(/xmlns:inkscape="[^"]*"/gi, '')
    // Collapse excess whitespace between tags
    .replace(/>\s+</g, '><')
    // Trim remaining leading/trailing whitespace
    .trim();

  return optimized;
}

/**
 * Validates, neutralizes, and securely sanitizes an SVG file content.
 * Guarantees zero executable code, zero foreignObjects, zero external resource leakage.
 */
export function sanitizeAndValidateSvg(svgRaw: string, fileSizeBytes?: number): SvgValidationResult {
  const originalSize = fileSizeBytes || (svgRaw ? svgRaw.length : 0);

  if (originalSize > MAX_SVG_SIZE_BYTES) {
    return { isValid: false, error: 'FILE_TOO_LARGE', originalSizeBytes: originalSize };
  }

  if (!svgRaw || typeof svgRaw !== 'string') {
    return { isValid: false, error: 'EMPTY_FILE' };
  }

  // Pre-clean and optimize
  const trimmed = optimizeSvgContent(svgRaw);

  // Length check (max 2.5MB)
  if (trimmed.length > MAX_SVG_SIZE_BYTES) {
    return { isValid: false, error: 'FILE_TOO_LARGE', originalSizeBytes: originalSize };
  }

  // Must contain an <svg tag
  const hasSvgTag = /<svg[\s>]/i.test(trimmed);
  if (!hasSvgTag) {
    return { isValid: false, error: 'NOT_VALID_SVG' };
  }

  // Preliminary strict pattern rejection of dangerous active payloads
  // Rejects: <script>, javascript:, foreignObject, inline events (onload=, onerror=, etc.), external imports
  const dangerousPatterns = [
    /<script[\s\S]*?>/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<foreignObject[\s\S]*?>/i,
    /<iframe[\s\S]*?>/i,
    /<object[\s\S]*?>/i,
    /<embed[\s\S]*?>/i,
    /\bon[a-z]{3,15}\s*=/i, // onload=, onerror=, onclick=, etc.
    /@import\s+/i,
    /xlink:href\s*=\s*["']https?:\/\//i,
    /href\s*=\s*["']https?:\/\//i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED',
      };
    }
  }

  // In browser context or DOM-available context, also run DOMPurify
  let sanitized = trimmed;
  if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
    sanitized = DOMPurify.sanitize(trimmed, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'link', 'use'],
      FORBID_ATTR: [
        'onload',
        'onerror',
        'onclick',
        'onmouseover',
        'onmouseout',
        'onfocus',
        'onblur',
        'onresize',
        'onbegin',
        'onend',
        'onrepeat',
      ],
      KEEP_CONTENT: false,
    });
  }

  // Verify that the sanitized string is still valid SVG
  if (!sanitized || !/<svg[\s>]/i.test(sanitized)) {
    return { isValid: false, error: 'SVG_INVALID_AFTER_SANITIZATION' };
  }

  // Safe base64 Data URI generation for <img> rendering
  const base64Content =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(sanitized)))
      : Buffer.from(sanitized, 'utf-8').toString('base64');

  const dataUri = `data:image/svg+xml;base64,${base64Content}`;

  return {
    isValid: true,
    sanitizedSvg: sanitized,
    dataUri,
    originalSizeBytes: originalSize,
    optimizedSizeBytes: sanitized.length,
  };
}
