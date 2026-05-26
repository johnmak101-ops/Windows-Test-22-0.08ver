import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import { messages } from './db/schema'

/**
 * Shared Hono routes — runtime-agnostic.
 * DB is accessed via c.var.db so it works with both
 * better-sqlite3 (local dev) and D1 (Cloudflare Workers).
 */
type AppEnv = { Variables: { db: BaseSQLiteDatabase<'sync' | 'async', any> } }

const app = new Hono<AppEnv>()

// Middleware — scoped to API routes only
app.use('/api/*', logger())
app.use('/api/*', cors({
  origin: (origin) => origin ?? '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))

// TODO: Add authentication for protected routes
// import { bearerAuth } from 'hono/bearer-auth'
// app.use('/api/*', bearerAuth({ token: 'your-secret-token' }))

// Routes
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

app.post('/api/hello', async (c) => {
  const db = c.get('db')
  const result = await db.insert(messages).values({
    content: `Hello from the API! Generated at ${new Date().toISOString()}`,
  }).returning()

  return c.json({
    message: result[0].content,
    id: result[0].id,
    createdAt: result[0].createdAt,
  })
})

app.get('/api/messages', async (c) => {
  const db = c.get('db')
  const allMessages = await db.select().from(messages).orderBy(messages.createdAt)
  return c.json({ messages: allMessages })
})

export default app
