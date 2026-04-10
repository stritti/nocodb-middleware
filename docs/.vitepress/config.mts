import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import semver from 'semver'
import { defineConfig } from 'vitepress'
import { useSidebar } from 'vitepress-openapi'
import yamlPlugin from '@rollup/plugin-yaml'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import jsYaml from 'js-yaml'
import openspec, {
  generateOpenSpecPages,
  generateOpenSpecSidebar,
  openspecNav,
} from '@stritti/vitepress-plugin-openspec'

type PackageMetadata = {
  version: string
}

const specPath = resolve(__dirname, '../../openapi.yaml')
const spec = jsYaml.load(readFileSync(specPath, 'utf-8')) as object

const openApiSidebar = useSidebar({ spec }).generateSidebarGroups()


const configDir = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(configDir, '..')
const projectRoot = resolve(docsRoot, '..')
const packageJsonPath = resolve(projectRoot, 'package.json')
const packageMetadata = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageMetadata
const version = semver.valid(packageMetadata.version)

if (!version) {
  throw new Error(`Invalid semver version in package.json: ${packageMetadata.version}`)
}

const parsedVersion = semver.parse(version)

if (!parsedVersion) {
  throw new Error(`Unable to parse semver version in package.json: ${version}`)
}

const majorMinorVersion = `${parsedVersion.major}.${parsedVersion.minor}`
const openSpecDir = resolve(projectRoot, 'openspec')

generateOpenSpecPages({
  specDir: openSpecDir,
  outDir: 'openspec',
  srcDir: docsRoot,
})

export default defineConfig({
  title: 'NocoDB Middleware',
  description: 'A robust NestJS middleware for NocoDB with authentication, caching, error handling, and API documentation.',
  base: '/nocodb-middleware/',
  ignoreDeadLinks: [/^http:\/\/localhost/],

  vite: {
    plugins: [yamlPlugin(), openspec({ specDir: openSpecDir, outDir: 'openspec' })],
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_MAJOR_MINOR_VERSION__: JSON.stringify(majorMinorVersion),
    },
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/middleware' },
      { text: 'API', link: '/api' },
      openspecNav(openSpecDir, { outDir: 'openspec', text: 'OpenSpec' }),
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
          { text: 'Middleware', link: '/middleware' },
          { text: 'Error Handling', link: '/error-handling' },
          { text: 'Caching', link: '/caching' },
          { text: 'RBAC API', link: '/rbac-api' },
          { text: 'NocoDB v3 Beispiele', link: '/nocodb-v3-usage-examples' },
          { text: 'TODO', link: '/TODO-NocoDB-Middleware' },
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
      {
        text: '/openspec/',
        items: generateOpenSpecSidebar(openSpecDir, { outDir: 'openspec' }),
      }
    ],
    semver: {
      version,
      majorMinorVersion,
    },
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
})
