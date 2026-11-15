import mongoose from 'mongoose'

export type DatabaseMode = 'mongo' | 'demo'

export async function connectDatabase(): Promise<DatabaseMode> {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    console.log('ORBITX API: MONGODB_URI is not set. Running in demo mode.')
    return 'demo'
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    })
    console.log('ORBITX API: MongoDB connected.')
    return 'mongo'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'
    console.warn(`ORBITX API: MongoDB unavailable (${message}). Running in demo mode.`)
    return 'demo'
  }
}
