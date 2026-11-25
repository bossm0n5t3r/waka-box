# waka-box

Updates a GitHub Gist with the top five languages from the authenticated WakaTime account over the last seven days.
Optionally, it also updates a second Gist with the AI vs. non-AI coding time ratio.

## Requirements

- Node.js 24
- pnpm 12
- A public GitHub Gist
- A classic GitHub personal access token with only the `gist` scope
- A WakaTime OAuth token

## GitHub Actions setup

Add the following repository secrets under **Settings > Secrets and variables > Actions**:

| Secret                 | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `GIST_ID`              | The identifier after the username in the Gist URL |
| `GH_TOKEN`             | GitHub token with the `gist` scope                |
| `WAKATIME_OAUTH_TOKEN` | WakaTime OAuth token                              |
| `AI_GIST_ID`           | Optional. Gist ID for the AI vs. non-AI breakdown |

The workflow runs every day at `00:00 UTC`. It can also be run manually from **Actions > Update gist with WakaTime
stats > Run workflow**.

## Local development

Install the development dependencies:

```sh
pnpm install --frozen-lockfile
```

Create a local environment file from the tracked template:

```sh
cp sample.env .env
```

Fill in the required values in `.env` (`AI_GIST_ID` is optional), then run:

```sh
pnpm start:local
```

The `.env` file is ignored by Git and must not be committed.

## Verification

```sh
pnpm typecheck
pnpm format:check
pnpm audit
```

Node.js 24 runs `index.ts` directly using native type stripping. The runtime
has no third-party dependencies, build step, or committed bundle.

## License

Originally derived from [matchai/waka-box](https://github.com/matchai/waka-box).
Distributed under the [ISC License](LICENSE).
