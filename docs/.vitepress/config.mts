import { defineConfig } from 'vitepress'
import { useSidebar } from 'vitepress-openapi'
import yamlPlugin from '@rollup/plugin-yaml'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import jsYaml from 'js-yaml'

const specPath = resolve(__dirname, '../../openapi.yaml')
const spec = jsYaml.load(readFileSync(specPath, 'utf-8')) as object

const openApiSidebar = useSidebar({ spec }).generateSidebarGroups()

export default defineConfig({
  title: 'NocoDB Middleware',
  description: 'A robust NestJS middleware for NocoDB with authentication, caching, error handling, and API documentation.',
  base: '/nocodb-middleware/',
  ignoreDeadLinks: [/^http:\/\/localhost/],

  vite: {
    plugins: [yamlPlugin()],
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/middleware' },
      { text: 'API', link: '/api' },
      { text: 'OpenAPI Spec', link: '/openapi-spec' },
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
      {
        text: 'OpenAPI Spec',
        items: openApiSidebar,
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/stritti/nocodb-middleware' },
    ],

    footer: {
      message: 'Released under the UNLICENSED License.',
      copyright: 'Copyright © stritti',
    },

    search: {
      provider: 'local',
    },
  },
})
