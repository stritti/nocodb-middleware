import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * Default sanitize-html options that strip ALL HTML tags.
 * Only plain text is allowed.
 */
const STRIP_ALL: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: [],
  disallowedTagsMode: 'discard',
};

/**
 * Class-transformer decorator that strips HTML tags from a string property.
 *
 * Use on DTO fields where user-submitted free text is accepted
 * to prevent stored XSS attacks.
 *
 * @example
 * class CreatePostDto {
 *   \@SanitizeHtml()
 *   title: string;
 * }
 *
 * @param options Optional sanitize-html options (default: strip all HTML)
 */
export function SanitizeHtml(options?: sanitizeHtml.IOptions) {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, { ...STRIP_ALL, ...options });
  });
}
