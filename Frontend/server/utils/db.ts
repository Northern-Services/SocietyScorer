import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const dbDir = path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'earlybirds.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    handicapIndex REAL NOT NULL,
    nextRoundPenalty REAL DEFAULT 0.0,
    role TEXT DEFAULT 'PLAYER',
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS competition_entries (
    id TEXT PRIMARY KEY,
    competitionId TEXT NOT NULL,
    playerId TEXT NOT NULL,
    registeredAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitionId) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(competitionId, playerId)
  );

  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    playerId TEXT NOT NULL,
    competitionId TEXT,
    courseId TEXT NOT NULL,
    holeScores TEXT NOT NULL,       -- Stored as JSON string array
    stablefordPoints INTEGER NOT NULL DEFAULT 0,
    handicapBeforeRound REAL NOT NULL,
    handicapAfterRound REAL NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playerId) REFERENCES players(id),
    FOREIGN KEY (competitionId) REFERENCES competitions(id),
    FOREIGN KEY (courseId) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS competition_players (
    competitionId TEXT,
    playerId TEXT,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (competitionId, playerId)
  );

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

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    numHoles INTEGER NOT NULL DEFAULT 18,
    pars TEXT NOT NULL,          -- JSON string array, e.g., "[4,4,3,5,4,4,3,4,5,...]"
    strokeIndexes TEXT NOT NULL, -- JSON string array, e.g., "[7,1,15,3,11,9,...]"
    handicapRules TEXT,
    createdBy TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS scorecards (
    id TEXT PRIMARY KEY,
    competitionId TEXT NOT NULL,
    playerId TEXT NOT NULL,
    holesCompleted INTEGER DEFAULT 0,
    totalPoints INTEGER DEFAULT 0,
    scores TEXT, -- Stored as JSON string
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitionId) REFERENCES competitions(id),
    FOREIGN KEY (playerId) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS competition_lobby (
    id TEXT PRIMARY KEY,
    competitionId TEXT NOT NULL,
    playerId TEXT NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitionId) REFERENCES competitions(id),
    FOREIGN KEY (playerId) REFERENCES players(id)
  );
`);

export { db }