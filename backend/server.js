import 'dotenv/config'
import * as Sentry from '@sentry/node'

// Sentry must be initialised before any other imports that might throw
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn:              process.env.SENTRY_DSN,
    environment:      process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  })
}

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import marRoutes from './routes/mar.js'
import stockRoutes from './routes/stock.js'
import tasksRoutes from './routes/tasks.js'
import fireRoutes from './routes/fire.js'
import visitorsRoutes from './routes/visitors.js'
import dashboardRoutes from './routes/dashboard.js'
import staffRoutes from './routes/staff.js'
import cdRoutes from './routes/cd.js'

const app = express()
const PORT = process.env.PORT || 3001

// ── CORS ─────────────────────────────────────────────────────
// Support comma-separated list of allowed origins for staging + production
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173'
const allowedOrigins = rawOrigins.split(',').map(o => o.trim())

// ── Security middleware ──────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS policy: origin ${origin} is not allowed`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))

// General rate limit: 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}))

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/mar',       marRoutes)
app.use('/api/stock',     stockRoutes)
app.use('/api/tasks',     tasksRoutes)
app.use('/api/fire',      fireRoutes)
app.use('/api/visitors',  visitorsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/staff',     staffRoutes)
app.use('/api/cd',        cdRoutes)

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Sentry error handler (must be before custom error handler) ─
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app)
}

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack)
  const status = err.status || 500
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

app.listen(PORT, () => {
  console.log(`CareSync API running on port ${PORT}`)
})
