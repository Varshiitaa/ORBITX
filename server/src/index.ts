import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { connectDatabase } from './db.js'
import { refreshCurrentEpoch } from './horizons.js'
import { gamesRouter } from './routes/games.js'
import { horizonsRouter } from './routes/horizons.js'
import { missionRouter } from './routes/missions.js'
import { spaceRouter } from './routes/space.js'

dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const mode = await connectDatabase()

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'orbitx',
    mode,
    mongo: mode === 'mongo',
  })
})

app.use('/api/missions', missionRouter(mode))
app.use('/api/horizons', horizonsRouter())
app.use('/api/space', spaceRouter())
app.use('/api/games', gamesRouter(mode))

const clientDist = path.resolve(process.cwd(), '../client/dist')
app.use(express.static(clientDist))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    next()
    return
  }
  res.sendFile(path.join(clientDist, 'index.html'), (error) => {
    if (error) {
      res.status(404).json({ message: 'ORBITX client build was not found. Start the Vite dev server, or run npm run build.' })
    }
  })
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unexpected server error'
  console.error(message)
  res.status(500).json({ message })
})

app.listen(port, () => {
  console.log(`ORBITX API listening on http://127.0.0.1:${port} (${mode})`)
  const refresh = () => {
    void refreshCurrentEpoch().then((result) => {
      if (result.errors.length > 0) {
        console.warn(`Horizons refresh: ${result.requested - result.errors.length} of ${result.requested} bodies updated.`)
      }
    })
  }
  refresh()
  setInterval(refresh, 15 * 60 * 1000)
})
