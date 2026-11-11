# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Strict Ownership Isolation (PII & Financial Records)**:
   - Every document in `/customers/{customerId}`, `/documentSets/{docSetId}`, and `/documentSets/{docSetId}/items/{itemId}` MUST belong to the authenticated user (`ownerId == request.auth.uid`) with `request.auth.token.email_verified == true`.
   - No user may read, list, create, update, or delete another user's customer records, document sets, or line items.
2. **Master Gate Relational Sync**:
   - A `DocumentItem` at `/documentSets/{docSetId}/items/{itemId}` cannot be created, read (`get`), updated, or deleted unless the parent `/documentSets/{docSetId}` exists and its `ownerId == request.auth.uid`.
   - Furthermore, `incoming().docSetId == docSetId` must hold on all writes to `/documentSets/{docSetId}/items/{itemId}`.
3. **Immutable Ownership & Creation Metadata**:
   - `ownerId` and `createdAt` (and `docSetId` on items) are strictly immutable after document creation.
4. **Temporal Integrity**:
   - On `create`, `createdAt == request.time` and `updatedAt == request.time`.
   - On `update`, `updatedAt == request.time` and `createdAt == resource.data.createdAt`.
5. **Volumetric & Schema Guardrails**:
   - Path IDs (`customerId`, `docSetId`, `itemId`) must match `^[a-zA-Z0-9_\-]+$` and be `<= 128` chars on single-document operations.
   - All strings have explicit `.size()` bounds matching `firebase-blueprint.json`.
   - All numeric fields (`discountAmount`, `vatRate`, `whtRate`, `quantity`, `unitPrice`, `sortOrder`) are bounded finite numbers.

---

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Customer Create**: `ownerId: "victim_uid_999"` while authenticated as `"attacker_uid_111"`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create a customer record.
3. **Shadow Field Injection on Customer Create**: Valid customer payload plus `"isAdmin": true`.
4. **Update-Gap Value Poisoning on Customer Update**: Updating `name` to a boolean `true` or a 10,000-character string.
5. **Ownership Transfer Attack on DocumentSet Update**: Attempting to mutate `ownerId` from `"attacker_uid_111"` to `"victim_uid_999"`.
6. **Timestamp Forgery on Create**: Supplying a past timestamp `createdAt: Timestamp.fromMillis(1000000)` instead of `request.time`.
7. **Immutable Timestamp Mutation on Update**: Changing `createdAt` during an `update` operation.
8. **Path ID Poisoning**: Creating a document with an invalid ID containing spaces or special characters or >128 chars.
9. **Orphaned Subcollection Item Write**: Creating `/documentSets/non_existent_doc/items/item_1` when `/documentSets/non_existent_doc` does not exist or belongs to another user.
10. **Cross-Parent Item Mismatch**: Creating `/documentSets/doc_A/items/item_1` with `docSetId: "doc_B"`.
11. **PII Blanket Read / Cross-Tenant Get**: Authenticated user `"attacker_uid_111"` attempting `get` on `/customers/victim_customer_1`.
12. **Unscoped List Scraping**: Authenticated user executing an unscoped `list` query on `/customers` or `/documentSets` without filtering `ownerId == request.auth.uid`.

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)

See `/firestore.rules.test.ts` for the complete test suite verifying that all 12 Dirty Dozen payloads return `PERMISSION_DENIED`.
