# Security Specification — TepatKerja Firestore Rules

## 1. Data Invariants
- Every `/users/{userId}` document belongs exclusively to the authenticated, email-verified user whose `request.auth.uid == userId` and `data.ownerUid == request.auth.uid`.
- Every `/users/{userId}/workspace/{workspaceId}` document requires an existing parent `/users/{userId}` document whose `ownerUid == request.auth.uid` (Master Gate) and must itself match `ownerUid == request.auth.uid`.
- `createdAt` and `ownerUid` are immutable after creation; `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
- All path variables (`userId`, `workspaceId`) must match `^[a-zA-Z0-9_\-]+$` and length `<= 128`.
- Unbounded arrays are prohibited; `shiftTemplates <= 30`, `weeklyRules == 7`, `dateOverrides <= 120`, `departureLogs <= 180`.
- Blank list queries across `/users` or subcollections are denied; only owner-scoped single-document access or explicit owner-matched list queries are allowed.

## 2. Dirty Dozen Adversarial Payloads
1. **Unauthenticated read/write** to `/users/uid1` -> `PERMISSION_DENIED`.
2. **Cross-tenant read** by `uid2` reading `/users/uid1` -> `PERMISSION_DENIED`.
3. **Cross-tenant workspace read/write** by `uid2` on `/users/uid1/workspace/main` -> `PERMISSION_DENIED`.
4. **Identity spoofing on create**: `uid1` creating `/users/uid1` with `ownerUid: "uid2"` -> `PERMISSION_DENIED`.
5. **Unverified email write**: `email_verified: false` creating `/users/uid1` -> `PERMISSION_DENIED`.
6. **Shadow/Ghost field injection**: `uid1` creating `/users/uid1` with extra key `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Timestamp forgery**: `uid1` creating `/users/uid1` with client-supplied past `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
8. **Immutable field mutation**: `uid1` updating `/users/uid1` changing `createdAt` or `ownerUid` -> `PERMISSION_DENIED`.
9. **Orphaned subcollection write**: `uid1` creating `/users/uid1/workspace/main` when parent `/users/uid1` does not exist -> `PERMISSION_DENIED`.
10. **Path variable poisoning**: `userId` or `workspaceId` containing invalid characters or `> 128` chars -> `PERMISSION_DENIED`.
11. **Array overflow / Denial of Wallet**: `dateOverrides` with 200 items or `displayName` with 5000 chars -> `PERMISSION_DENIED`.
12. **Blanket collection list scraping**: `uid2` listing `/users` collection -> `PERMISSION_DENIED`.
