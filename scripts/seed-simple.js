/**
 * Simplified Database Seeding - Matching Exact Schema
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with test data...\n');

  try {
    // 1. Create Budgets (matching exact schema)
    console.log('💰 Creating budgets...');
    const budgets = await Promise.all([
      prisma.budget.create({
        data: {
          name: 'Q1 2025 Medical Equipment Budget',
          fiscalYear: 2025,
          type: 'DEPARTMENT',
          department: 'Cardiology',
          status: 'APPROVED',
          currency: 'KWD',
          totalAmount: 5000000,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
          approvedDate: new Date('2025-01-05'),
          notes: 'First quarter budget for medical equipment procurement',
        }
      }),
      prisma.budget.create({
        data: {
          name: 'Q2 2025 Pharmaceutical Budget',
          fiscalYear: 2025,
          type: 'DEPARTMENT',
          department: 'Pharmacy',
          status: 'APPROVED',
          currency: 'KWD',
          totalAmount: 3000000,
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          approvedDate: new Date('2025-04-01'),
          notes: 'Second quarter budget for pharmaceutical supplies',
        }
      }),
      prisma.budget.create({
        data: {
          name: 'Annual Tender Budget 2025',
          fiscalYear: 2025,
          type: 'TENDER',
          status: 'ACTIVE',
          currency: 'KWD',
          totalAmount: 10000000,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          notes: 'Master budget for all tender activities in 2025',
        }
      }),
    ]);
    console.log(`✅ Created ${budgets.length} budgets\n`);

    // 2. Create Tenders
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
      prisma.tender.create({
        data: {
          tenderNumber: 'MOH/CMS/2025/048',
          title: 'Laboratory Equipment and Reagents',
          description: 'Automated hematology analyzer, chemistry analyzer, and reagents for 1 year',
          status: 'AWARDED',
          category: 'LABORATORY_EQUIPMENT',
          estimatedValue: 620000,
          currency: 'KWD',
          submissionDeadline: new Date('2024-12-15'),
          openingDate: new Date('2024-12-16'),
          department: 'Laboratory',
          location: 'Central Laboratory, MOH',
          bondRequired: true,
          bondAmount: 12400,
          technicalRequirements: 'Fully automated analyzers with LIS integration, ISO 13485 certified',
          commercialRequirements: '2 years warranty, reagent supply agreement',
        }
      }),
      prisma.tender.create({
        data: {
          tenderNumber: 'MOH/CMS/2025/049',
          title: 'Ambulance Fleet Renewal',
          description: '10 fully equipped ambulances with advanced life support equipment',
          status: 'CANCELLED',
          category: 'VEHICLES',
          estimatedValue: 1200000,
          currency: 'KWD',
          submissionDeadline: new Date('2025-01-10'),
          openingDate: new Date('2025-01-11'),
          department: 'Emergency Services',
          location: 'Various Hospitals',
          bondRequired: true,
          bondAmount: 24000,
          technicalRequirements: 'Type B ambulances, diesel engine, 4x4 capability, full ALS equipment',
          commercialRequirements: '3 years warranty, maintenance package',
        }
      }),
    ]);
    console.log(`✅ Created ${tenders.length} tenders\n`);

    // 3. Create Expenses
    console.log('💸 Creating expenses...');
    
    // First, check if Expense model has budgetId field
    const expenses = await Promise.all([
      prisma.expense.create({
        data: {
          expenseNumber: 'EXP-2025-001',
          description: 'Office supplies and stationery',
          amount: 2500,
          currency: 'KWD',
          category: 'OFFICE_SUPPLIES',
          date: new Date('2025-01-15'),
          status: 'APPROVED',
          paymentMethod: 'BANK_TRANSFER',
        }
      }),
      prisma.expense.create({
        data: {
          expenseNumber: 'EXP-2025-002',
          description: 'Travel expenses for tender site visit',
          amount: 1200,
          currency: 'KWD',
          category: 'TRAVEL',
          date: new Date('2025-01-20'),
          status: 'PENDING',
          paymentMethod: 'CREDIT_CARD',
        }
      }),
      prisma.expense.create({
        data: {
          expenseNumber: 'EXP-2025-003',
          description: 'Consultant fees for technical evaluation',
          amount: 5000,
          currency: 'KWD',
          category: 'CONSULTING',
          date: new Date('2025-02-01'),
          status: 'APPROVED',
          paymentMethod: 'BANK_TRANSFER',
        }
      }),
    ]);
    console.log(`✅ Created ${expenses.length} expenses\n`);

    console.log('🎉 Database seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Budgets: ${budgets.length}`);
    console.log(`   - Tenders: ${tenders.length}`);
    console.log(`   - Expenses: ${expenses.length}`);
    console.log(`   - Customers: 10 (already created)`);
    console.log(`   - Suppliers: 6 (already created)`);
    console.log('\n✅ All test data created successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
