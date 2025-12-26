


const express = require('express');
const fs = require('fs');
const path = require('path');
const Upload = require('../models/Upload');
const Chunk = require('../models/Chunk');

const router = express.Router();

router.post('/:uploadId/chunk', async (req, res) => {
  const { uploadId } = req.params;
  const chunkIndex = Number(req.headers['chunk-index']);
  const chunkSize = Number(req.headers['chunk-size']);

  if (Number.isNaN(chunkIndex) || Number.isNaN(chunkSize)) {
    return res.status(400).json({ error: 'Missing headers' });
  }

  const upload = await Upload.findOne({ uploadId });
  if (!upload) return res.status(404).end();

  const chunk = await Chunk.findOne({ uploadId, chunkIndex });
  if (!chunk) return res.status(400).end();

  // Idempotency
  if (chunk.status === 'UPLOADED') {
    return res.json({ status: 'already uploaded' });
  }

  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const filePath = path.join(uploadDir, `${uploadId}.bin`);
  const start = chunkIndex * chunkSize;

  const writeStream = fs.createWriteStream(filePath, {
    flags: 'a',
    start
  });

  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    chunk.status = 'UPLOADED';
    chunk.receivedAt = new Date();
    await chunk.save();
    res.json({ status: 'ok' });
  });

  writeStream.on('error', () => {
    res.status(500).end();
  });
});

module.exports = router;














// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const Busboy = require('busboy');
// const Upload = require('../models/Upload');
// const Chunk = require('../models/Chunk');

// const router = express.Router();

// router.post('/:uploadId/chunk', async (req, res) => {
//   const { uploadId } = req.params;
//   const chunkIndex = Number(req.headers['chunk-index']);
//   const chunkSize = Number(req.headers['chunk-size']);

//   const upload = await Upload.findOne({ uploadId });
//   if (!upload) return res.status(404).end();

//   const chunk = await Chunk.findOne({ uploadId, chunkIndex });
//   if (!chunk) return res.status(400).end();

//   // Idempotent check
//   if (chunk.status === 'UPLOADED') {
//     return res.json({ status: 'already uploaded' });
//   }

//   const uploadDir = path.join(__dirname, '../uploads');
//   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

//   const filePath = path.join(uploadDir, `${uploadId}.bin`);
//   const start = chunkIndex * chunkSize;

//   const writeStream = fs.createWriteStream(filePath, {
//     flags: 'a',
//     start
//   });

//   const busboy = Busboy({ headers: req.headers });

//   busboy.on('file', (_, file) => {
//     file.pipe(writeStream);
//   });

//   busboy.on('finish', async () => {
//     chunk.status = 'UPLOADED';
//     chunk.receivedAt = new Date();
//     await chunk.save();
//     res.json({ status: 'ok' });
//   });

//   req.pipe(busboy);
// });

// module.exports = router;
