const mongoose = require('mongoose');

module.exports = mongoose.model(
  'Chunk',
  new mongoose.Schema({
    uploadId: String,
    chunkIndex: Number,
    status: {
      type: String,
      enum: ['PENDING', 'UPLOADED'],
      default: 'PENDING'
    },
    receivedAt: Date
  })
);
