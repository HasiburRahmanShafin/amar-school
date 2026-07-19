// Run once with: npm run seed:superadmin
// Creates the first Super Admin account directly in the DB,
// since Super Admins are not meant to self-register.
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env before seeding');
    process.exit(1);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log('Super Admin already exists:', existing.email);
    process.exit(0);
  }

  const superAdmin = await User.create({
    name,
    email,
    password,
    role: 'super_admin',
    status: 'active',
  });

  console.log('Super Admin created:', superAdmin.email);
  process.exit(0);
};

seed();
