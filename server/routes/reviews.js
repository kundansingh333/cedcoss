/**
 * reviews.js - Routes for review CRUD and filtering
 * Will be implemented in Phase 10
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({ message: 'Reviews route - coming in Phase 10' });
});

module.exports = router;
