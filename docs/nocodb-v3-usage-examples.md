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
- Der Code spricht ausschließlich die NocoDB-v3-API (Meta + Data) an; v2-Pfade (`/api/v2`) kommen in `src/` nicht vor.
