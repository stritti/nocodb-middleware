# NocoDB V3 Usage Examples (aktualisiert)

Diese Beispiele zeigen die beabsichtigte V3-nahe Nutzung über `NocoDBV3Service`.

## Basis

```ts
const created = await nocoDBV3Service.create(tableId, {
  username: 'john',
  email: 'john@example.com',
});

const one = await nocoDBV3Service.read(tableId, created.id);

const updated = await nocoDBV3Service.update(tableId, created.id, {
  email: 'john+updated@example.com',
});

await nocoDBV3Service.delete(tableId, created.id);
```

## Listen / Filter / Pagination

```ts
const page = await nocoDBV3Service.list(tableId, {
  where: '(is_active,eq,true)',
  sort: '-created_at',
  limit: 50,
  offset: 0,
});
```

## Beziehungen (LTAR)

```ts
await nocoDBV3Service.createWithLinks(tableId, {
  name: 'Example'
}, [
  { fieldName: 'role', recordIds: [2] }
]);
```

## Wichtig

- Zielbild: API-Verhalten semantisch eng an NocoDB V3 halten.
- Aktuell existiert im Code noch ein Hybridbetrieb (v2/v3) in Teilen der RBAC-/Init-Logik.
- Die vollständige V3-Harmonisierung läuft über OpenSpec-Changes.
