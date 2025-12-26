const mongoose = require('mongoose');

module.exports = mongoose.model(
  'Upload',
  new mongoose.Schema({
    uploadId: String,
    filename: String,
    totalSize: Number,
    totalChunks: Number,
    status: {
      type: String,
      enum: ['UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'UPLOADING'
    },
    finalHash: String
  }, { timestamps: true })
);
