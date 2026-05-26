import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import app from './app'
import * as schema from './db/schema'

/**
 * Cloudflare Workers entry point.
 * Injects D1 database into Hono context,
 * mounts the shared API routes, and falls back
 * to static assets for the SPA.
 */
type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
}

const MIME_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  wasm: 'application/wasm',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
  webmanifest: 'application/manifest+json',
}

function getContentType(pathname: string): string | null {
  const ext = pathname.split('.').pop()?.toLowerCase()
  return ext ? (MIME_TYPES[ext] ?? null) : null
}

const worker = new Hono<{ Bindings: Bindings }>()

// Inject D1 via Drizzle into context for API routes
worker.use('/api/*', async (c, next) => {
  const d1db = drizzle(c.env.DB, { schema })
  c.set('db', d1db)
  await next()
})

// Mount shared API routes
worker.route('/', app)

// SPA fallback — serve static assets for non-API routes
worker.all('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw)

  // Fix Content-Type if the asset layer returns application/octet-stream
  const ct = response.headers.get('content-type')
  if (!ct || ct === 'application/octet-stream') {
    const url = new URL(c.req.url)
    const mime = getContentType(url.pathname) ?? 'text/html; charset=utf-8'
    const headers = new Headers(response.headers)
    headers.set('content-type', mime)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  return response
})

export default worker
