import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { theme as openApiTheme, createOpenApiSpec } from 'vitepress-openapi/client'
import 'vitepress-openapi/dist/style.css'

import spec from '../../../openapi.yaml'

const openapi = createOpenApiSpec(spec)

export default {
  extends: DefaultTheme,
  async enhanceApp(ctx) {
    openApiTheme.enhanceApp({ ...ctx, openapi })
  },
} satisfies Theme
