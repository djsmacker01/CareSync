<!-- Thanks for contributing! A few sentences is fine — this doesn't need to be a essay. -->

## What does this change?

<!-- What you changed and why. Link the issue if there is one, e.g. "Fixes #12". -->

## How did you test it?

<!-- e.g. "Ran the Playwright suite" / "Tested on a tablet in Chrome" / "Added a new test for X" -->

## Checklist

- [ ] `npm run lint` and `npm test` pass in `frontend/`
- [ ] No clinical records are hard-deleted, and MAR entries stay append-only (see [the rules that can't be broken](../README.md#the-rules-that-cant-be-broken))
- [ ] New API endpoints check the user's role server-side
- [ ] Tap targets are still at least 44px if you touched the UI
- [ ] No real keys, secrets, or resident data in the diff
