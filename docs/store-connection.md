# Store connection: unpublished verification stage

Customer: `/demo/stores/`. Staff: `/demo/stores/staff.html`.

The browser receives an intentionally public Supabase publishable key. Never add a secret/service-role key. Staff authenticate using email/password and are authorized by the server's store membership checks; a hidden URL is not authentication. Sessions stay in memory, so a reload requires login again. No legacy local demo posts/photos are imported or uploaded.

The store must remain `published=false` during this stage. Anonymous public reads return no notices. Staff preview uses an authenticated, whitelisted RPC and can also show withdrawn notices. It does not request audit history or staff membership records. Public and staff pages use independent in-memory clients. The customer page does not load staff UI or provide staff controls.

Post/edit uses the same notice ID and expected version. Retry uses the same request ID for the same content, including when the old UI regenerates a temporary ID/time. Expiry is assigned by the server for 24 hours. End does not delete data. The former withdraw control is replaced with confirmed deletion: prepare a private server-side plan, remove its exact image paths through the authenticated Storage API, and finish only after the server verifies those paths are absent. Partial failures remain incomplete and resumable. Only active store staff can execute these operations. Existing withdrawn posts are not deleted automatically.

Deletion removes the notice row and exclusive current/old photo objects. Photos referenced by any other notice's current data or private history (including already deleted notices) remain protected. Audit history retains title/body/image path strings and other notice fields; image bytes are not embedded in it. No restore button is offered. Previously downloaded copies and unattributable failed-upload objects are outside this operation. No automatic sweep is performed. The store can only be made public through a separately approved backend change.

Likes remain a browser-local daily demo, not shared counts, visits or unique people. No analytics service or KPI screen was added.

Build: `npm ci && npm run build:store-client`. Unit checks: `npm test`. Browser checks: `node scripts/test-store-connected.mjs` (Edge) or `TEST_BROWSER=webkit` with installed Playwright WebKit. Browser tests intercept backend traffic and use fabricated records; they do not prove live login/storage behavior.

Before releasing store information, verify with the owner's own login: actual photo upload/download, posting, editing, ending, withdrawing, version conflicts, token expiry/revocation and another authorized session. Verify anonymous denial again while unpublished. Do not infer private store state solely from an empty public list. Account passwords must be entered by the account owner, never retrieved from local browser profiles or committed.
