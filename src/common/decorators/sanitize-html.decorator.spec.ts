import { plainToInstance } from 'class-transformer';
import { SanitizeHtml } from './sanitize-html.decorator';

describe('@SanitizeHtml', () => {
  class TestDto {
    @SanitizeHtml()
    title!: string;
  }

  class TestDtoWithCustomOptions {
    @SanitizeHtml({ allowedTags: ['b', 'i'] })
    description!: string;
  }

  it('strips HTML tags and their content from a string value', () => {
    const result = plainToInstance(TestDto, {
      title: '<script>alert("xss")</script>Hello',
    });
    // sanitize-html strips the entire <script> element including content
    expect(result.title).toBe('Hello');
  });

  it('removes all HTML tags by default', () => {
    const result = plainToInstance(TestDto, {
      title: '<b>Bold</b> <i>Italic</i> <a href="http://evil.com">link</a>',
    });
    expect(result.title).toBe('Bold Italic link');
  });

  it('strips event handlers from tags', () => {
    const result = plainToInstance(TestDto, {
      title: '<p onclick="alert(1)">paragraph</p>',
    });
    expect(result.title).toBe('paragraph');
  });

  it('handles plain text without HTML', () => {
    const result = plainToInstance(TestDto, {
      title: 'Just regular text',
    });
    expect(result.title).toBe('Just regular text');
  });

  it('handles empty string', () => {
    const result = plainToInstance(TestDto, {
      title: '',
    });
    expect(result.title).toBe('');
  });

  it('handles non-string values without crashing', () => {
    const result = plainToInstance(TestDto, {
      title: 42 as unknown as string,
    });
    expect(result.title).toBe(42);
  });

  it('handles null/undefined values', () => {
    const result1 = plainToInstance(TestDto, { title: null });
    const result2 = plainToInstance(TestDto, { title: undefined });
    expect(result1.title).toBeNull();
    expect(result2.title).toBeUndefined();
  });

  it('removes script tags and their content completely', () => {
    const result = plainToInstance(TestDto, {
      title: '<script type="text/javascript">alert("xss")</script>clean',
    });
    // Script tags are fully removed including their content
    expect(result.title).toBe('clean');
  });

  it('removes nested HTML completely', () => {
    const result = plainToInstance(TestDto, {
      title: '<div><span><b>nested</b></span></div>',
    });
    expect(result.title).toBe('nested');
  });

  it('allows specific tags when custom options are passed', () => {
    const result = plainToInstance(TestDtoWithCustomOptions, {
      description:
        '<b>bold</b> and <i>italic</i> and <script>alert(1)</script>',
    });
    // <b> and <i> are allowed, <script> (including content) should be stripped
    expect(result.description).toBe('<b>bold</b> and <i>italic</i> and ');
  });

  it('does not contain script or event handler remnants after sanitization', () => {
    const result = plainToInstance(TestDto, {
      title: '<script>alert("xss")</script><img src=x onerror=alert(1)>clean',
    });
    expect(result.title).not.toContain('<script>');
    expect(result.title).not.toContain('onerror');
    expect(result.title).not.toContain('<img');
    expect(result.title).toBe('clean');
  });

  it('sanitizes multiple XSS vectors', () => {
    const result = plainToInstance(TestDto, {
      title:
        '<script>evil()</script> and <img src=x onerror=alert(1)> and <a href="javascript:alert(1)">link</a>',
    });
    expect(result.title).not.toContain('script');
    expect(result.title).not.toContain('onerror');
    expect(result.title).not.toContain('javascript:');
    expect(result.title).not.toContain('evil');
    expect(result.title).not.toContain('alert');
  });
});
