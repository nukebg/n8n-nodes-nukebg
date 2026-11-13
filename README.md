# n8n-nodes-nukebg

An [n8n](https://n8n.io) community node for [NukeBG](https://nukebg.com): remove image backgrounds, remove objects and upscale images inside your workflows. It replaces remove.bg in n8n, whose self-serve API closes on 1 December 2026.

## Install

In n8n: **Settings → Community Nodes → Install**, enter `n8n-nodes-nukebg`, and accept the prompt. Then add a **NukeBG API** credential with a key from [nukebg.com/account](https://nukebg.com/account) (new accounts get 50 free credits).

## Operations

| Operation | What it does | Credits |
|---|---|---|
| Remove Background | Transparent cutout, or the subject on white, a colour, a gradient or a built-in scene, at an optional Amazon, Shopify, Etsy, eBay or Instagram size, with an optional shadow | 1 (HD 2, Ultra 4) |
| Remove Objects | Removes what you describe ("the cables on the desk"); the rest stays unchanged | 25 |
| Upscale | 2× or 4× (paid credits) | 2 or 4 |
| Get Credits | Balance and plan | free |

Input is a binary field (for example from an HTTP Request, Google Drive or S3 node) or an image URL. The result is written to a binary field (`data` by default) with `width`, `height`, `creditsCharged` and `creditsRemaining` in the item's JSON. Failed calls are never charged. With **Continue On Fail**, errors come back as items instead of stopping the workflow.

Binary input is sent as base64, so keep source images under about 3 MB; use an image URL for anything larger.

## Switching from an HTTP Request node that calls remove.bg

You can keep your HTTP Request node and change the URL to `https://api.nukebg.com/v1.0/removebg` and the `X-Api-Key` value to your NukeBG key. Or replace it with this node to get binary output, marketplace sizes and credit details without parsing headers.

## Develop

Built with n8n's official [`@n8n/node-cli`](https://www.npmjs.com/package/@n8n/node-cli).

```bash
npm install
npm run dev      # starts n8n with this node loaded and rebuilds on change
npm run lint     # n8n's community-node lint rules (strict mode)
npm run build
```

Releases are published to npm from GitHub Actions with provenance (`.github/workflows/publish.yml`), as n8n requires for verified community nodes. Run `npm run release` to bump the version, tag and push; the tag triggers the publish.

MIT licensed. NukeBG is a product of VOLODS LTD. Not affiliated with remove.bg or n8n.
