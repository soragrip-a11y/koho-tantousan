# Store connection: unpublished verification stage

Customer: `/demo/stores/`. Staff: `/demo/stores/staff.html`.

The browser receives an intentionally public Supabase publishable key. Never add a secret/service-role key. Staff authenticate using email/password and are authorized by the server's store membership checks; a hidden URL is not authentication. Sessions stay in memory, so a reload requires login again. No legacy local demo posts/photos are imported or uploaded.

The store must remain `published=false` during this stage. Anonymous public reads return no notices. Staff preview uses an authenticated, whitelisted RPC and can also show withdrawn notices. It does not request audit history or staff membership records. Public and staff pages use independent in-memory clients. The customer page does not load staff UI or provide staff controls.

Post/edit uses the same notice ID and expected version. Retry uses the same request ID for the same content, including when the old UI regenerates a temporary ID/time. Expiry is assigned by the server for 24 hours. End and withdraw do not delete data. Old or abandoned image objects can remain private; automatic cleanup is not implemented. The store can only be made public through a separately approved backend change.

Likes remain a browser-local daily demo, not shared counts, visits or unique people. No analytics service or KPI screen was added.

Build: `npm ci && npm run build:store-client`. Unit checks: `npm test`. Browser checks: `node scripts/test-store-connected.mjs` (Edge) or `TEST_BROWSER=webkit` with installed Playwright WebKit. Browser tests intercept backend traffic and use fabricated records; they do not prove live login/storage behavior.

Before releasing store information, verify with the owner's own login: actual photo upload/download, posting, editing, ending, withdrawing, version conflicts, token expiry/revocation and another authorized session. Verify anonymous denial again while unpublished. Do not infer private store state solely from an empty public list. Account passwords must be entered by the account owner, never retrieved from local browser profiles or committed.
