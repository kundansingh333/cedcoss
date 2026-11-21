/**
 * upload.js - Route for CSV file upload
 * Will be implemented in Phase 4
 */

const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.status(501).json({ message: 'Upload route - coming in Phase 4' });
});

module.exports = router;
