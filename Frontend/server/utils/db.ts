import { createClient } from '@libsql/client'

// Initialize the Turso client using environment variables
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:earlybirds.db', // Fallback to local file for offline dev if needed
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// Async function to initialize tables on startup
export async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      handicapIndex REAL NOT NULL,
      nextRoundPenalty REAL DEFAULT 0.0,
      role TEXT DEFAULT 'MEMBER',
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date DATETIME NOT NULL,
      venue TEXT NOT NULL,
      courseId TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      prize1st REAL DEFAULT 0,
      prize2nd REAL DEFAULT 0,
      prize3rd REAL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (courseId) REFERENCES courses(id)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS competition_entries (
      id TEXT PRIMARY KEY,
      competitionId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      registeredAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competitionId) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(competitionId, playerId)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      playerId TEXT NOT NULL,
      competitionId TEXT,
      courseId TEXT NOT NULL,
      holeScores TEXT NOT NULL,
      stablefordPoints INTEGER NOT NULL DEFAULT 0,
      handicapBeforeRound REAL NOT NULL,
      handicapAfterRound REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playerId) REFERENCES players(id),
      FOREIGN KEY (competitionId) REFERENCES competitions(id),
      FOREIGN KEY (courseId) REFERENCES courses(id)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS competition_players (
      competitionId TEXT,
      playerId TEXT,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (competitionId, playerId)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      requesterId TEXT NOT NULL,
      receiverId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesterId) REFERENCES players(id),
      FOREIGN KEY (receiverId) REFERENCES players(id),
      UNIQUE(requesterId, receiverId)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      numHoles INTEGER NOT NULL DEFAULT 18,
      pars TEXT NOT NULL,
      strokeIndexes TEXT NOT NULL,
      handicapRules TEXT,
      createdBy TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES players(id)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scorecards (
      id TEXT PRIMARY KEY,
      competitionId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      holesCompleted INTEGER DEFAULT 0,
      totalPoints INTEGER DEFAULT 0,
      scores TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competitionId) REFERENCES competitions(id),
      FOREIGN KEY (playerId) REFERENCES players(id)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS competition_lobby (
      id TEXT PRIMARY KEY,
      competitionId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competitionId) REFERENCES competitions(id),
      FOREIGN KEY (playerId) REFERENCES players(id)
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS twos (
      id TEXT PRIMARY KEY,
      competitionId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      holeNumber INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competitionId) REFERENCES competitions(id),
      FOREIGN KEY (playerId) REFERENCES players(id),
      UNIQUE(competitionId, playerId, holeNumber)
    );
  `)
}

export { db }