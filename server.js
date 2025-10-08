const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const config = require('./config');
const database = require('./services/database');
const blockchain = require('./services/blockchain');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = config.app.port;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: config.app.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Basic authentication for API routes
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Authentication required' */ });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username === config.app.adminUsername && 
      bcrypt.compareSync(password, config.app.adminPasswordHash)) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

// Routes
app.use('/api', auth, apiRoutes);
app.use('/admin', adminRoutes);

// Serve admin panel at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = 'connected'; // In a real app, you'd check actual connection
    
    // Check blockchain provider
    const blockNumber = await blockchain.providerHttp.getBlockNumber();
    const providerStatus = blockNumber > 0 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'ok',
      timestamp: new Date(),
      services: {
        database: dbStatus,
        blockchain: providerStatus
      },
      blockNumber
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize services
async function initialize() {
  try {
    await database.initialize();
    console.log('Database initialized');
    
    // Start blockchain monitoring
    blockchain.startMonitoring();
    console.log('Blockchain monitoring started');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Start the application
initialize();
```__
