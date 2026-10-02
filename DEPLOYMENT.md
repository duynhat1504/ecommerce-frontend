# Frontend production deployment

## Architecture

```text
Internet
  |
  v
Public Caddy / reverse proxy
  |
  +--> coffee.duynhat.dev
  |       -> frontend container (Caddy, port 80 on Docker network only)
  |
  +--> api.coffee.duynhat.dev
          -> backend container
```

The frontend image contains a Caddy web server and the Vite `dist` output only.
The public Caddy terminates TLS and is the only component that publishes ports
to the internet. The frontend Compose file does not publish a host port or the
Vite development port (`5173`).

`Caddyfile` in this repository serves static files and falls back to
`index.html`. This preserves direct refreshes of React Router routes such as
`/products`, `/account/profile`, and `/admin/orders`.

## Production API URL

Vite replaces `VITE_*` values while running `npm run build`; changing a
container environment variable after the image is built will not change the
API URL in its JavaScript bundle.

Use the public, non-secret URL below for production:

```dotenv
VITE_API_BASE_URL=https://api.coffee.duynhat.dev/api
```

`.env.production.example` is a documented template. Do not commit a real
`.env` file or any secret. `VITE_*` variables are visible to browsers and must
never contain credentials.

Store `VITE_API_BASE_URL` in a GitHub **Repository Variable** for this single
production target. Use a GitHub Environment Variable instead if staging and
production need separate approval gates and values. It is intentionally not a
GitHub Secret because the final value is public in the Vite bundle.

## Build the image locally

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.coffee.duynhat.dev/api \
  -t ecommerce-frontend:local .
```

The Dockerfile fails before `npm run build` if this argument is absent. This
prevents accidentally creating an image that uses the local API fallback.

## Run locally with Docker

To test the image without the production reverse proxy, bind an explicit local
port:

```bash
docker run --rm -p 8080:80 ecommerce-frontend:local
```

Open `http://localhost:8080/products` and refresh the page. It must return the
React application rather than a 404. The production Compose file deliberately
does not use this host-port mapping.

## Server Compose setup

Create the directory referenced by `DEPLOY_PATH` and the shared Docker network
once on the EC2 instance:

```bash
docker network create coffee-public
```

The deployment workflow synchronizes `docker-compose.prod.yml` to
`DEPLOY_PATH` before it pulls the immutable image.

Connect the public Caddy container to `coffee-public`, then configure its
production Caddyfile with the frontend upstream (alongside the backend route):

```caddyfile
coffee.duynhat.dev {
  reverse_proxy frontend:80
}

api.coffee.duynhat.dev {
  reverse_proxy backend:8080
}
```

The backend's CORS and cookie configuration must allow the exact origin
`https://coffee.duynhat.dev` with credentials. This is required by the
existing frontend `fetch(..., { credentials: "include" })` behavior and is not
changed by this deployment configuration.

## Docker Hub tags

Each push to `main` publishes both:

```text
<DOCKERHUB_USERNAME>/ecommerce-frontend:latest
<DOCKERHUB_USERNAME>/ecommerce-frontend:<git-sha>
```

`latest` is a convenience tag. Deployment always pulls and starts the immutable
`<git-sha>` tag.

## GitHub Actions configuration

Create these Repository Variables:

| Variable | Purpose |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub namespace that owns the image. |
| `VITE_API_BASE_URL` | `https://api.coffee.duynhat.dev/api` for the production Vite build. |

Create these Repository Secrets:

| Secret | Purpose |
| --- | --- |
| `DOCKERHUB_TOKEN` | Docker Hub access token with permission to push the image. |
| `DEPLOY_HOST` | EC2 host name or IP address. |
| `DEPLOY_USER` | SSH user on the EC2 instance. |
| `DEPLOY_SSH_KEY` | Private key used by the deployment workflow. |
| `DEPLOY_PATH` | Absolute EC2 directory containing `docker-compose.prod.yml`. |

For a private Docker Hub image, log the EC2 Docker daemon in to Docker Hub once
with a deploy credential before the first `docker compose pull`.

## Deploy and rollback

The GitHub workflow deploys automatically after a successful push to `main`.
Its equivalent server commands are:

```bash
cd "$DEPLOY_PATH"
export FRONTEND_IMAGE=<DOCKERHUB_USERNAME>/ecommerce-frontend:<git-sha>
docker compose -f docker-compose.prod.yml pull frontend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

To roll back, substitute a previously published, known-good SHA:

```bash
cd "$DEPLOY_PATH"
export FRONTEND_IMAGE=<DOCKERHUB_USERNAME>/ecommerce-frontend:<previous-git-sha>
docker compose -f docker-compose.prod.yml pull frontend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

## Post-deploy checks

```bash
curl -I https://coffee.duynhat.dev/
curl -I https://coffee.duynhat.dev/products
docker compose -f docker-compose.prod.yml ps
```

Also refresh `/products` and `/admin` in a browser, verify no SPA 404 occurs,
and inspect browser Network requests to confirm API calls target
`https://api.coffee.duynhat.dev/api` rather than localhost.
