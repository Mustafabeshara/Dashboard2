#!/usr/bin/env node

/**
 * Production Database Seeding Script
 * Run this ONCE after first deployment to create initial admin user and basic data
 * 
 * Usage: node scripts/seed-production.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@beshara.com' }
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping seed.');
    return;
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@beshara.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      department: 'IT',
      isActive: true
    }
  });

  console.log('✅ Created admin user:', admin.email);

  // Create basic departments
  const departments = ['Finance', 'Sales', 'Operations', 'IT', 'Management'];
  
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept },
      update: {},
      create: {
        name: dept,
        code: dept.substring(0, 3).toUpperCase(),
        isActive: true
      }
    });
  }

  console.log('✅ Created departments');

  // Create budget categories
  const categories = [
    { name: 'Medical Equipment', code: 'MED-EQ', level: 1 },
    { name: 'Office Supplies', code: 'OFF-SUP', level: 1 },
    { name: 'Marketing', code: 'MKT', level: 1 },
    { name: 'Operations', code: 'OPS', level: 1 }
  ];

  for (const category of categories) {
    await prisma.budgetCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category
    });
  }

  console.log('✅ Created budget categories');

  console.log('🎉 Production database seeded successfully!');
  console.log('');
  console.log('📝 Login credentials:');
  console.log('   Email: admin@beshara.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('⚠️  IMPORTANT: Change the admin password immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
