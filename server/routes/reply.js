/**
 * reply.js - Route for on-demand suggested reply generation
 * Will be implemented in Phase 13
 */

const express = require('express');
const router = express.Router();

router.post('/:id/reply', (req, res) => {
  res.status(501).json({ message: 'Reply route - coming in Phase 13' });
});

module.exports = router;
