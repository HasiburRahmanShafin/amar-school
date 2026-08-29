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

const admissionRoutes = require('./routes/admission.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const examRoutes = require('./routes/exam.routes');

const studentDashboardRoutes = require('./routes/studentDashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const parentAccountRoutes = require('./routes/parentAccount.routes');
const attendanceRoutes = require('./routes/attendance.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
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
app.use('/api/exams', examRoutes);

app.use('/api/admissions', admissionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);

app.use('/api/student-dashboard', studentDashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/parent-accounts', parentAccountRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorMiddleware);

module.exports = app;
