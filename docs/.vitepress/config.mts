import { defineConfig } from 'vitepress'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withOpenSpec } from '@stritti/vitepress-plugin-openspec'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')

export default defineConfig(
  withOpenSpec(
    {
      title: 'NocoDB Middleware',
      description: 'A robust NestJS middleware for NocoDB with authentication, caching, error handling, and API documentation.',
      base: '/nocodb-middleware/',
      ignoreDeadLinks: [/^http:\/\/localhost/],

      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/middleware' },
          { text: 'API', link: '/api' },
        ],

        sidebar: [
          {
            text: 'Getting Started',
            items: [
              { text: 'Overview', link: '/' },
              { text: 'Middleware', link: '/middleware' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'API Documentation', link: '/api' },
              { text: 'Error Handling', link: '/error-handling' },
              { text: 'Caching', link: '/caching' },
              { text: 'Testing', link: '/testing' },
              { text: 'Versioning', link: '/versioning' },
            ],
          },
          {
            text: 'Advanced',
            items: [
              { text: 'NocoDB v3 Usage Examples', link: '/nocodb-v3-usage-examples' },
              { text: 'Database Schema', link: '/database-schema' },
              { text: 'Product Readiness', link: '/product-readiness' },
            ],
          },
        ],

        socialLinks: [
          { icon: 'github', link: 'https://github.com/stritti/nocodb-middleware' },
        ],

        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © stritti',
        },

        search: {
          provider: 'local',
        },
      },
    },
    { specDir: resolve(__dirname, '../../openspec') }
  )
)
