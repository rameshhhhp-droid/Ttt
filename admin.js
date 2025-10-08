const express = require('express');
const path = require('path');

const router = express.Router();

// Serve admin panel
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve static assets
router.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/styles.css'));
});

router.get('/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.js'));
});

module.exports = router;
```__
