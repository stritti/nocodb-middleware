import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'nocodb-middleware',
  description:
    'A robust NestJS middleware for NocoDB with authentication, RBAC, caching, error handling, and API documentation.',
  base: '/nocodb-middleware/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Developer Guide', link: '/developer-guide' },
      { text: 'Security', link: '/security' },
      { text: 'Deployment', link: '/deployment' },
      { text: 'API', link: '/api' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/' },
            { text: 'Developer Guide', link: '/developer-guide' },
            { text: 'Security', link: '/security' },
            { text: 'Deployment', link: '/deployment' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API', link: '/api' },
            { text: 'Middleware', link: '/middleware' },
            { text: 'Error Handling', link: '/error-handling' },
            { text: 'Caching', link: '/caching' },
            { text: 'Testing', link: '/testing' },
            { text: 'Product Readiness', link: '/product-readiness' },
            { text: 'Versioning', link: '/versioning' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/stritti/nocodb-middleware' }],
  },

  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
  },
})
