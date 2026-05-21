# RBAC API Dokumentation

Alle Endpunkte liegen unter `/admin/permissions`.

> Hinweis: Endpunkte sind geschützt (JWT + PermissionsGuard + `@Require*`-Decorator).

---

## 1) Rollen

### `POST /admin/permissions/roles`
Erstellt eine Rolle.

### `GET /admin/permissions/roles`
Liefert alle Rollen.

### `DELETE /admin/permissions/roles/:roleId`
Löscht eine Rolle.

---

## 2) User-Rollen Zuordnung

### `POST /admin/permissions/user-roles/assign`
Weist einem User eine Rolle zu.

Body:

```json
{
  "userId": 123,
  "roleId": 2
}
```

### `POST /admin/permissions/user-roles/assign-multiple`
Weist mehrere Rollen zu.

### `GET /admin/permissions/users/:userId/roles`
Liefert Rollen eines Users.

### `DELETE /admin/permissions/user-roles/users/:userId/roles/:roleId`
Entfernt eine Rolle vom User.

---

## 3) Tabellen-Berechtigungen

### `POST /admin/permissions/table-permissions`
Setzt/aktualisiert CRUD-Rechte einer Rolle auf eine Tabelle.

### `POST /admin/permissions/table-permissions/batch`
Setzt mehrere Tabellenberechtigungen in einem Request.

### `GET /admin/permissions/roles/:roleId/permissions`
Liefert Tabellenberechtigungen einer Rolle.

### `DELETE /admin/permissions/roles/:roleId/permissions`
Löscht alle Tabellenberechtigungen einer Rolle.

### `POST /admin/permissions/roles/:sourceRoleId/copy-to/:targetRoleId`
Kopiert Berechtigungen von einer Rolle auf eine andere.

---

## 4) Decorators im Anwendungscode

Verfügbare Decorators:

- `@RequireCreate(tableName)`
- `@RequireRead(tableName)`
- `@RequireUpdate(tableName)`
- `@RequireDelete(tableName)`
- `@RequirePermissions({ table, action })`

Beispiel:

```ts
@Get()
@RequireRead('products')
findAll() {
  return ...;
}
```

---

## Hinweis zur V3-Ausrichtung

Die RBAC-Fachlogik ist vorhanden, aber Datenzugriffe sind aktuell noch teils v2-basiert. Die vollständige V3-Harmonisierung ist in OpenSpec-Changes geplant.
