const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Upload = require('../models/Upload');
const Chunk = require('../models/Chunk');

const router = express.Router();

router.post('/init', async (req, res) => {
  const { filename, totalSize, totalChunks } = req.body;

  let upload = await Upload.findOne({ filename, totalSize });

  if (!upload) {
    const uploadId = uuidv4();
    upload = await Upload.create({
      uploadId,
      filename,
      totalSize,
      totalChunks
    });

    const chunks = Array.from({ length: totalChunks }, (_, i) => ({
      uploadId,
      chunkIndex: i
    }));
    await Chunk.insertMany(chunks);
  }

  const uploaded = await Chunk.find({
    uploadId: upload.uploadId,
    status: 'UPLOADED'
  }).select('chunkIndex');

  res.json({
    uploadId: upload.uploadId,
    uploadedChunks: uploaded.map(c => c.chunkIndex)
  });
});

module.exports = router;
