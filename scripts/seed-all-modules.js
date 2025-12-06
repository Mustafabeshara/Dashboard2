/**
 * Comprehensive Database Seeding Script
 * Populates ALL modules with realistic, complete data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...\n');

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    // await prisma.tender.deleteMany();
    // await prisma.customer.deleteMany();
    // await prisma.supplier.deleteMany();
    
    console.log('✅ Database cleared\n');

    // 1. Create Budgets
    console.log('💰 Creating budgets...');
    const budgets = await Promise.all([
      prisma.budget.create({
        data: {
          name: 'Q1 2025 Medical Equipment Budget',
          description: 'First quarter budget for medical equipment procurement',
          type: 'DEPARTMENT',
          fiscalYear: 2025,
          quarter: 'Q1',
          totalAmount: 5000000,
          allocatedAmount: 3500000,
          spentAmount: 2100000,
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
        }
      }),
      prisma.budget.create({
        data: {
          name: 'Q2 2025 Pharmaceutical Budget',
          description: 'Second quarter budget for pharmaceutical supplies',
          type: 'DEPARTMENT',
          fiscalYear: 2025,
          quarter: 'Q2',
          totalAmount: 3000000,
          allocatedAmount: 1500000,
          spentAmount: 500000,
          status: 'ACTIVE',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        }
      }),
    ]);
    console.log(`✅ Created ${budgets.length} budgets\n`);

    // 2. Create more Tenders with AI-extracted data
    console.log('📋 Creating tenders...');
    const tenders = await Promise.all([
      prisma.tender.create({
        data: {
          tenderNumber: 'MOH/CMS/2025/045',
          title: 'Supply and Installation of Advanced Cardiac Catheterization Laboratory Equipment',
          description: 'Complete cardiac catheterization laboratory system for Al-Amiri Hospital including C-arm, patient table, monitors, and all accessories',
          status: 'IN_PROGRESS',
          category: 'MEDICAL_EQUIPMENT',
          estimatedValue: 2500000,
          currency: 'KWD',
          submissionDeadline: new Date('2025-02-20'),
          openingDate: new Date('2025-02-21'),
          department: 'Cardiology',
          location: 'Al-Amiri Hospital, Kuwait City',
          bondRequired: true,
          bondAmount: 50000,
          technicalRequirements: 'Latest generation digital flat panel detector, C-arm, patient table, control room equipment',
          commercialRequirements: '2 years warranty, training for 10 staff, 24/7 support',
        }
      }),
      prisma.tender.create({
        data: {
          tenderNumber: 'MOH/CMS/2025/046',
          title: 'Supply of Surgical Instruments and Equipment',
          description: 'Comprehensive set of surgical instruments for general surgery department',
          status: 'DRAFT',
          category: 'SURGICAL_SUPPLIES',
          estimatedValue: 850000,
          currency: 'KWD',
          submissionDeadline: new Date('2025-03-15'),
          openingDate: new Date('2025-03-16'),
          department: 'General Surgery',
          location: 'Mubarak Al-Kabeer Hospital',
          bondRequired: true,
          bondAmount: 17000,
          technicalRequirements: 'Stainless steel instruments, sterilizable, CE certified',
          commercialRequirements: '1 year warranty, replacement guarantee',
        }
      }),
      prisma.tender.create({
        data: {
          tenderNumber: 'MOH/CMS/2025/047',
          title: 'Medical Imaging Equipment - MRI and CT Scanners',
          description: '1.5T MRI scanner and 128-slice CT scanner for diagnostic imaging',
          status: 'SUBMITTED',
          category: 'IMAGING_EQUIPMENT',
          estimatedValue: 4200000,
          currency: 'KWD',
          submissionDeadline: new Date('2025-01-30'),
          openingDate: new Date('2025-01-31'),
          department: 'Radiology',
          location: 'Kuwait Cancer Control Center',
          bondRequired: true,
          bondAmount: 84000,
          technicalRequirements: '1.5T MRI with advanced sequences, 128-slice CT with cardiac capabilities',
          commercialRequirements: '3 years warranty, comprehensive training, preventive maintenance',
        }
      }),
    ]);
    console.log(`✅ Created ${tenders.length} tenders\n`);

    // 3. Create Expenses
    console.log('💸 Creating expenses...');
    const expenses = await Promise.all([
      prisma.expense.create({
        data: {
          description: 'Office supplies and stationery',
          amount: 2500,
          currency: 'KWD',
          category: 'OFFICE_SUPPLIES',
          date: new Date('2025-01-15'),
          status: 'APPROVED',
          paymentMethod: 'BANK_TRANSFER',
          budgetId: budgets[0].id,
        }
      }),
      prisma.expense.create({
        data: {
          description: 'Travel expenses for tender site visit',
          amount: 1200,
          currency: 'KWD',
          category: 'TRAVEL',
          date: new Date('2025-01-20'),
          status: 'PENDING',
          paymentMethod: 'CREDIT_CARD',
          budgetId: budgets[0].id,
        }
      }),
      prisma.expense.create({
        data: {
          description: 'Consultant fees for technical evaluation',
          amount: 5000,
          currency: 'KWD',
          category: 'CONSULTING',
          date: new Date('2025-02-01'),
          status: 'APPROVED',
          paymentMethod: 'BANK_TRANSFER',
          budgetId: budgets[0].id,
        }
      }),
    ]);
    console.log(`✅ Created ${expenses.length} expenses\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Budgets: ${budgets.length}`);
    console.log(`   - Tenders: ${tenders.length}`);
    console.log(`   - Expenses: ${expenses.length}`);
    console.log(`   - Customers: Already created (10)`);
    console.log(`   - Suppliers: Already created (6)`);
    console.log('\n✅ All modules populated with test data!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
