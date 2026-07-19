const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const superadminRoutes = require('./routes/superadmin.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Amar School API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorMiddleware);

module.exports = app;
