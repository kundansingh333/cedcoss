/**
 * uploadMiddleware.js - Multer Configuration and File Validation
 *
 * Security & Reliability Features:
 * - Restricts uploads strictly to CSV files (checks both file extension and MIME type)
 * - Limits file size to 5MB (configured in constants.js)
 * - Stores files with timestamped unique filenames in server/uploads/ to prevent collisions
 * - Catches Multer errors (file size exceeded, wrong file type) and returns user-friendly JSON
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } = require('../utils/constants');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: reviews-timestamp-random.csv
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `reviews-${uniqueSuffix}${ext}`);
  },
});

// File filter: Validate extension and MIME type
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate extension
  if (ext !== '.csv') {
    return cb(
      new Error('Invalid file type. Only .csv files are supported.'),
      false
    );
  }

  // Validate MIME type (CSV MIME types vary across OS/browsers)
  const validMimes = [...ALLOWED_MIME_TYPES, 'text/plain', 'application/csv'];
  if (!validMimes.includes(file.mimetype)) {
    return cb(
      new Error(`Unsupported file MIME type: ${file.mimetype}. Expected a CSV file.`),
      false
    );
  }

  cb(null, true);
};

// Multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5 MB max
    files: 1, // Only single file upload
  },
  fileFilter,
});

/**
 * Express middleware wrapper to catch Multer errors gracefully
 * and format them into clean JSON responses instead of crashing or returning HTML
 */
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File Too Large',
          message: `The uploaded file exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.`,
        });
      }
      return res.status(400).json({
        error: 'Upload Error',
        message: err.message,
      });
    } else if (err) {
      return res.status(400).json({
        error: 'Invalid File',
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Missing File',
        message: "No file was uploaded. Please attach a CSV file under the 'file' field.",
      });
    }

    next();
  });
};

module.exports = { handleUpload };
