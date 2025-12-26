process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});


require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cleanup = require('./cleanup');

const app = express();
app.use(express.json());
app.use(cors()); 
app.use('/uploads', require('./routes/init'));
app.use('/uploads', require('./routes/chunk'));
app.use('/uploads', require('./routes/finalize'));


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err.message));

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Waiting for reconnection...');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

setInterval(cleanup, 60 * 60 * 1000); // every 1 hour

