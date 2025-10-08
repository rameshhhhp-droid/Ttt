const { exec } = require('child_process');
const path = require('path');

// Run the database initialization script
exec(`node ${path.join(__dirname, '../migrations/001_init_db.js')}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error initializing database: ${error}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  
  console.log(`Database initialized successfully: ${stdout}`);
});
