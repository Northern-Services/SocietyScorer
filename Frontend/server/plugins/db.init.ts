import { initializeDatabase } from '../utils/db'

export default defineNitroPlugin(async () => {
  if (import.meta.client) return
  try {
    await initializeDatabase()
    // eslint-disable-next-line no-console
    console.log('[db.init] Database tables initialized')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[db.init] Failed to initialize database tables:', error)
  }
})
