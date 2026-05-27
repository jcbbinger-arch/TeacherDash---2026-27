# Security Specification: Teacher Dashboard Zero-Trust Data Synchronization

## 1. Data Invariants
- `User Profile Access (`/users/{userId}`):` A user's profile can only be read or written if `request.auth.uid == userId`.
- `User Sync Data Access (`/users/{userId}/data/{docId}`):` Synchronized application state documents can only be retrieved, listed, created, modified, or deleted if `request.auth.uid == userId`.
- `Identity Integrity:` It is strictly forbidden for user A to access or write to any document under user B's path.
- `Validation helpers` must run on both create and update.

## 2. The "Dirty Dozen" Malicious Payloads
Here are the 12 attack vectors designed to breach security, and how our rule set shields the application:

1. **Unauthenticated Read on User Space (`/users/user_123`)**
   - Payload: GET request from anonymous client.
   - Result: `PERMISSION_DENIED`.

2. **Unauthenticated Write on User Space (`/users/user_123`)**
   - Payload: `{ uid: "user_123", email: "malicious@attacker.com" }` from anonymous client.
   - Result: `PERMISSION_DENIED`.

3. **Cross-User Data Leak (`/users/victim_uid/data/students`)**
   - Action: Read request by authenticated user `attacker_uid`.
   - Result: `PERMISSION_DENIED`.

4. **Cross-User Data Manipulation (`/users/victim_uid/data/students`)**
   - Payload: `{ data: [], updatedAt: "2026-05-27T19:10:00Z" }` sent by authenticated user `attacker_uid`.
   - Result: `PERMISSION_DENIED`.

5. **Resource Poisoning (Junk document ID in data collection)**
   - Payload: Write to `/users/user_123/data/very_long_invalid_id_with_special_chars_%&*#`
   - Result: `PERMISSION_DENIED` (IDs must match alphanumeric/dash regex, and size limits).

6. **Missing Verification Check (Email spoofing)**
   - Action: Request with email matching a registered user but `email_verified == false`.
   - Result: `PERMISSION_DENIED`.

7. **Tampering with Immortability (Self-assigned creation timestamp modification on update)**
   - Action: Update `/users/user_123` with a stale user object trying to change `uid`.
   - Result: `PERMISSION_DENIED`.

8. **Shadow Update Gate bypass**
   - Payload: Update with additional "Ghost Field" (e.g. `isAdmin: true` or custom system metadata) outside defined schema.
   - Result: `PERMISSION_DENIED`.

9. **Blanket Collection Leak**
   - Action: Scrape list of all users at `/users` or data under `/users/{user}/data` with generic query.
   - Result: `PERMISSION_DENIED` unless queried with exact owner constraints.

10. **Denial of Wallet Recursion Attack**
    - Action: Heavy `get()` queries nested deeply in rules.
    - Result: Prevented by early authentication & schema validation before expensive database lookup checks.

11. **Orphaned Writes or Timestamp Spoofing**
    - Payload: `{ data: [], updatedAt: "2020-01-01T00:00:00Z" }` (pretending to be historical state).
    - Result: Rejected; `updatedAt` field must match `request.time`.

12. **Malformed Schema Payload**
    - Payload: `{ data: "not-an-object", updatedAt: "2026-05-27T19:10:00Z" }` where `data` is a flat string instead of map/array elements.
    - Result: `PERMISSION_DENIED`.

## 3. Security Rules Outline

A Zero-Trust declarative security rule set will be defined in `firestore.rules` and tested during compilation.
