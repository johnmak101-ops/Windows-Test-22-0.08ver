import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db } from './db'
import app from './app'

/**
 * Node.js entry point for local development.
 * Injects the local better-sqlite3 DB into Hono context,
 * then mounts the shared routes.
 */
const server = new Hono()

// Inject local DB into context for all routes
server.use('*', async (c, next) => {
  c.set('db', db)
  await next()
})

server.route('/', app)

const port = parseInt(process.env.PORT ?? '3000', 10)
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: server.fetch,
  port,
})
