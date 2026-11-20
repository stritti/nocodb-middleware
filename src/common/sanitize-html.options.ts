import sanitizeHtml from 'sanitize-html';

/**
 * Base sanitize-html options that strip ALL HTML tags.
 * Only plain text is allowed to prevent XSS attacks;
 * text content within tags is preserved.
 *
 * Shared by the global sanitize middleware and the `@SanitizeHtml()`
 * decorator; both extend it with their context-specific options.
 */
export const STRIP_ALL_HTML: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};
