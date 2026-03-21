# NocoDB Middleware Dokumentation

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { site } = useData()
const currentVersion = computed(() => site.value.themeConfig.semver.version)
</script>

Aktuelle Version (Semver Major.Minor.Patch): **{{ currentVersion }}**

## Inhalte

- [API](./api.md)
- [Middleware](./middleware.md)
- [Error Handling](./error-handling.md)
- [Caching](./caching.md)
- [RBAC API](./rbac-api.md)
- [NocoDB v3 Beispiele](./nocodb-v3-usage-examples.md)
- [Testing](./testing.md)
- [TODO](./TODO-NocoDB-Middleware.md)
- [OpenSpec](./openspec/index.md)
