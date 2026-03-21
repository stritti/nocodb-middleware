import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import semver from 'semver'
import { defineConfig } from 'vitepress'
import openspec, {
  generateOpenSpecPages,
  generateOpenSpecSidebar,
  openspecNav,
} from '@stritti/vitepress-plugin-openspec'

type PackageMetadata = {
  version: string
}

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
  description: 'Technische Dokumentation für das NocoDB Middleware Projekt',
  lastUpdated: true,
  vite: {
    plugins: [openspec({ specDir: openSpecDir, outDir: 'openspec' })],
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_MAJOR_MINOR_VERSION__: JSON.stringify(majorMinorVersion),
    },
  },
  themeConfig: {
    nav: [
      { text: 'Start', link: '/' },
      { text: 'API', link: '/api' },
      openspecNav(openSpecDir, { outDir: 'openspec', text: 'OpenSpec' }),
    ],
    sidebar: {
      '/': [
        {
          text: 'Dokumentation',
          items: [
            { text: 'Überblick', link: '/index' },
            { text: 'API', link: '/api' },
            { text: 'Middleware', link: '/middleware' },
            { text: 'Error Handling', link: '/error-handling' },
            { text: 'Caching', link: '/caching' },
            { text: 'RBAC API', link: '/rbac-api' },
            { text: 'NocoDB v3 Beispiele', link: '/nocodb-v3-usage-examples' },
            { text: 'Testing', link: '/testing' },
            { text: 'TODO', link: '/TODO-NocoDB-Middleware' },
          ],
        },
      ],
      '/openspec/': generateOpenSpecSidebar(openSpecDir, { outDir: 'openspec' }),
    },
    semver: {
      version,
      majorMinorVersion,
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ssr/nocodb-middleware' }],
  },
})
