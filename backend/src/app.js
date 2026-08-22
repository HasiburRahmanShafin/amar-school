const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const websiteRoutes = require('./routes/website.routes');
const galleryRoutes = require('./routes/gallery.routes');
const uploadRoutes = require('./routes/upload.routes');
const noticeRoutes = require('./routes/notice.routes');
const routineRoutes = require('./routes/routine.routes');
const financialRoutes = require('./routes/financial.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
// Default express.json() limit is 100kb - too small once logoUrl/bannerUrl
// hold base64 image data, so this is raised to comfortably fit a couple
// of images in one request.
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Amar School API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/financial', financialRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorMiddleware);

module.exports = app;
