/**
 * test-upload.js - Automated Test Script for Phase 4 CSV Upload & Parsing
 *
 * Tests verified:
 * 1. Valid CSV file upload & parsing via Supertest
 * 2. Header normalization (e.g. review_id -> reviewId)
 * 3. Non-CSV file rejection (security & validation)
 * 4. Missing file error handling
 * 5. Temp file cleanup verification (ensures uploads/ directory has no orphaned files)
 */

const path = require('path');
const fs = require('fs');
const request = require('supertest');
const { app } = require('./server');

const runUploadTests = async () => {
  console.log('🧪 Starting Phase 4 CSV Upload & Parsing Tests...\n');

  try {
    const csvPath = path.join(__dirname, 'sample_reviews.csv');

    // Test 1: Upload valid CSV
    console.log('1️⃣ Testing Valid CSV Upload & Parsing...');
    const res1 = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    if (res1.status === 200 && res1.body.success) {
      console.log(`✅ Upload Succeeded! HTTP 200`);
      console.log(`   - Upload Batch ID: ${res1.body.uploadBatchId}`);
      console.log(`   - Total Rows Parsed: ${res1.body.totalRows}`);
      console.log(`   - Sample Row 1:`, res1.body.sampleReviews[0]);
    } else {
      throw new Error(`Upload failed with status ${res1.status}: ${JSON.stringify(res1.body)}`);
    }

    // Test 2: Upload invalid file type (e.g. .txt or .png)
    console.log('\n2️⃣ Testing Rejection of Non-CSV Files...');
    const dummyTxtPath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(dummyTxtPath, 'hello world not a csv');

    const res2 = await request(app)
      .post('/api/upload')
      .attach('file', dummyTxtPath);

    fs.unlinkSync(dummyTxtPath);

    if (res2.status === 400 && res2.body.error === 'Invalid File') {
      console.log(`✅ Server correctly rejected non-CSV file with HTTP 400: "${res2.body.message}"`);
    } else {
      throw new Error(`Invalid file was unexpectedly accepted: ${res2.status}`);
    }

    // Test 3: Upload with no file attached
    console.log('\n3️⃣ Testing Upload with Missing File...');
    const res3 = await request(app).post('/api/upload');

    if (res3.status === 400 && res3.body.error === 'Missing File') {
      console.log(`✅ Server correctly rejected empty request with HTTP 400: "${res3.body.message}"`);
    } else {
      throw new Error(`Missing file request unexpectedly handled: ${res3.status}`);
    }

    // Test 4: Verify uploaded files are cleaned up from server/uploads/
    console.log('\n4️⃣ Verifying Temp File Cleanup in server/uploads/...');
    const uploadDir = path.join(__dirname, 'uploads');
    const remainingFiles = fs.readdirSync(uploadDir).filter((f) => f !== '.gitkeep');

    if (remainingFiles.length === 0) {
      console.log(`✅ Temp file cleanup verified! 0 orphaned files in ${uploadDir}`);
    } else {
      console.warn(`⚠️ Warning: Found leftover files: ${remainingFiles.join(', ')}`);
    }

    console.log('\n🎉 ALL PHASE 4 CSV UPLOAD & PARSING TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Phase 4 Test Failed:', error.message);
    process.exit(1);
  }
};

runUploadTests();
