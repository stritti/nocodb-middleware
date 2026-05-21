import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import jsYaml from 'js-yaml'

const spec = jsYaml.load(
  readFileSync(resolve(__dirname, '../../openapi.yaml'), 'utf-8')
) as { paths: Record<string, Record<string, { operationId?: string; tags?: string[] }>> }

const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']

export default {
  paths() {
    const operationIds: string[] = []

    for (const pathItem of Object.values(spec.paths ?? {})) {
      for (const method of httpMethods) {
        const operation = pathItem[method]
        if (operation?.operationId) {
          operationIds.push(operation.operationId)
        }
      }
    }

    return operationIds.map((id) => ({ params: { id } }))
  },
}
