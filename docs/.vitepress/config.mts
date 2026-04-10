import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'nocodb-middleware',
  description: 'A robust NestJS middleware for NocoDB with comprehensive authentication, caching, error handling, and API documentation.',

  // https://vitepress.dev/reference/site-config#base
  base: '/nocodb-middleware/',

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config#nav
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Developer Guide', link: '/docs/developer-guide' },
      { text: 'API', link: '/api' },
      { text: 'Security', link: '/docs/security-audit' },
    ],

    // https://vitepress.dev/reference/default-theme-config#sidebar
    sidebar: {
      '/docs/': [
        {
          text: 'Dokumentation',
          items: [
            { text: 'API-Dokumentation', link: '/api' },
            { text: 'Developer Guide', link: '/docs/developer-guide' },
            { text: 'Security Audit', link: '/docs/security-audit' },
            { text: 'Produkt Readiness', link: '/docs/product-readiness' },
          ],
        },
      ],

      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/' },
            { text: 'Developer Guide', link: '/docs/developer-guide' },
          ],
        },
      ],
    },

    // https://vitepress.dev/reference/default-theme-config#sociallinks
    socialLinks: [{ icon: 'github', link: 'https://github.com/stritti/nocodb-middleware' }],
  },

  // https://vitepress.dev/reference/site-config#markdown
  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
  },
})
