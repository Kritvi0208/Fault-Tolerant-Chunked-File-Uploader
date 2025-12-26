const fs = require('fs');
const path = require('path');
const Upload = require('./models/Upload');
const Chunk = require('./models/Chunk');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const TWO_HOURS = 2 * 60 * 60 * 1000;

async function cleanup() {
  const cutoff = new Date(Date.now() - TWO_HOURS);

  const staleUploads = await Upload.find({
    status: 'UPLOADING',
    updatedAt: { $lt: cutoff }
  });

  for (const u of staleUploads) {
    // delete file
    const filePath = path.join(UPLOAD_DIR, `${u.uploadId}.bin`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // delete DB entries
    await Chunk.deleteMany({ uploadId: u.uploadId });
    await Upload.deleteOne({ uploadId: u.uploadId });

    console.log('Cleaned upload:', u.uploadId);
  }
}

module.exports = cleanup;
