const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yauzl = require('yauzl');
const Upload = require('../models/Upload');
const Chunk = require('../models/Chunk');

const router = express.Router();

router.post('/:uploadId/finalize', async (req, res) => {
  const { uploadId } = req.params;

  const upload = await Upload.findOne({ uploadId });
  if (!upload) return res.status(404).end();

  // Double-finalize guard
  if (upload.status === 'COMPLETED') {
    return res.json({ status: 'already finalized', hash: upload.finalHash });
  }
  if (upload.status === 'PROCESSING') {
    return res.status(409).json({ status: 'processing' });
  }

  // Ensure all chunks uploaded
  const pending = await Chunk.countDocuments({ uploadId, status: { $ne: 'UPLOADED' } });
  if (pending > 0) {
    return res.status(400).json({ error: 'chunks missing' });
  }

  upload.status = 'PROCESSING';
  await upload.save();

  const filePath = path.join(__dirname, '../uploads', `${uploadId}.bin`);

  // SHA-256 (streaming)
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on('data', d => hash.update(d))
      .on('end', resolve)
      .on('error', reject);
  });
  const finalHash = hash.digest('hex');

  // ZIP peek (top-level names only)

const names = [];

try {
  await new Promise((resolve) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        return resolve(); // invalid ZIP → skip peeking safely
      }

      zip.on('error', () => {
        resolve(); // IMPORTANT: prevent crash
      });

      zip.on('entry', e => {
        if (!e.fileName.includes('/')) {
          names.push(e.fileName);
        }
        zip.readEntry();
      });

      zip.on('end', resolve);

      zip.readEntry();
    });
  });
} catch {
  // Do NOTHING — peeking failure must never crash server
}


  upload.status = 'COMPLETED';
  upload.finalHash = finalHash;
  await upload.save();

  res.json({ status: 'completed', hash: finalHash, files: names });
});

module.exports = router;
