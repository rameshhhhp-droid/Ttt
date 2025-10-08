const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create approvals table
    db.run(`CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      allowance TEXT NOT NULL,
      balance TEXT,
      unlimited_flag BOOLEAN DEFAULT FALSE,
      will_cover BOOLEAN DEFAULT FALSE,
      tx_hash TEXT UNIQUE NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME
    )`, (err) => {
      if (err) {
        console.error('Error creating approvals table:', err.message);
      } else {
        console.log('Approvals table created or already exists.');
      }
    });
    
    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_owner ON approvals(owner)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tx_hash ON approvals(tx_hash)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_processed ON approvals(processed)`);
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database setup completed.');
      }
    });
  }
});
