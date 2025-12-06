/**
 * Database Seed Script
 * Populates the database with sample data for development and testing
 */
import { PrismaClient, UserRole, BudgetType, BudgetStatus, CategoryType, TenderStatus, CustomerType, ExpenseStatus, TransactionStatus, TransactionType, AlertType, AlertSeverity } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data
  console.log('Cleaning existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.budgetApproval.deleteMany()
  await prisma.budgetTransaction.deleteMany()
  await prisma.budgetAlert.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.budgetCategory.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.tender.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.company.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // Create Users
  console.log('Creating users...')
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@beshara.com',
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        role: UserRole.ADMIN,
        department: 'IT',
        phone: '+965-1234-5678',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'ceo@beshara.com',
        passwordHash: hashedPassword,
        fullName: 'Mustafa Beshara',
        role: UserRole.CEO,
        department: 'Executive',
        phone: '+965-1234-5679',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'cfo@beshara.com',
        passwordHash: hashedPassword,
        fullName: 'Ahmad Al-Fahad',
        role: UserRole.CFO,
        department: 'Finance',
        phone: '+965-1234-5680',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'finance.manager@beshara.com',
        passwordHash: hashedPassword,
        fullName: 'Sara Al-Rashid',
        role: UserRole.FINANCE_MANAGER,
        department: 'Finance',
        phone: '+965-1234-5681',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sales.manager@beshara.com',
        passwordHash: hashedPassword,
        fullName: 'Mohammed Al-Salem',
        role: UserRole.MANAGER,
        department: 'Sales',
        phone: '+965-1234-5682',
        isActive: true,
      },
    }),
  ])

  console.log(`Created ${users.length} users`)

  // Create Manufacturers/Suppliers
  console.log('Creating companies...')
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'Medtronic Inc.',
        type: 'MANUFACTURER',
        country: 'USA',
        website: 'https://www.medtronic.com',
        primaryContact: 'John Smith',
        email: 'sales@medtronic.com',
        phone: '+1-555-1234',
        paymentTerms: 'Net 60',
        creditLimit: 500000,
        currency: 'USD',
        certifications: { ISO: '13485', FDA: true, CE: true },
      },
    }),
    prisma.company.create({
      data: {
        name: 'Stryker Corporation',
        type: 'MANUFACTURER',
        country: 'USA',
        website: 'https://www.stryker.com',
        primaryContact: 'Jane Doe',
        email: 'sales@stryker.com',
        phone: '+1-555-5678',
        paymentTerms: 'Net 45',
        creditLimit: 750000,
        currency: 'USD',
        certifications: { ISO: '13485', FDA: true, CE: true },
      },
    }),
    prisma.company.create({
      data: {
        name: 'Boston Scientific',
        type: 'MANUFACTURER',
        country: 'USA',
        website: 'https://www.bostonscientific.com',
        primaryContact: 'Michael Brown',
        email: 'sales@bsci.com',
        phone: '+1-555-9012',
        paymentTerms: 'Net 30',
        creditLimit: 400000,
        currency: 'USD',
        certifications: { ISO: '13485', FDA: true, CE: true },
      },
    }),
  ])

  console.log(`Created ${companies.length} companies`)

  // Create Customers (Hospitals)
  console.log('Creating customers...')
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Mubarak Al-Kabeer Hospital',
        type: CustomerType.GOVERNMENT,
        address: 'Jabriya, Block 4',
        city: 'Kuwait City',
        country: 'Kuwait',
        primaryContact: 'Dr. Abdullah Al-Mutairi',
        email: 'procurement@moh.gov.kw',
        phone: '+965-2222-1111',
        paymentTerms: 'Net 90',
        creditLimit: 1000000,
        departments: ['Cardiology', 'Neurosurgery', 'Orthopedics', 'Radiology'],
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Al-Amiri Hospital',
        type: CustomerType.GOVERNMENT,
        address: 'Kuwait City, Block 1',
        city: 'Kuwait City',
        country: 'Kuwait',
        primaryContact: 'Dr. Fatima Al-Sabah',
        email: 'procurement.amiri@moh.gov.kw',
        phone: '+965-2222-2222',
        paymentTerms: 'Net 90',
        creditLimit: 800000,
        departments: ['Cardiology', 'General Surgery', 'ICU'],
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Kuwait Cancer Control Center',
        type: CustomerType.GOVERNMENT,
        address: 'Shuwaikh, Block 3',
        city: 'Kuwait City',
        country: 'Kuwait',
        primaryContact: 'Dr. Khalid Hassan',
        email: 'procurement.kccc@moh.gov.kw',
        phone: '+965-2222-3333',
        paymentTerms: 'Net 90',
        creditLimit: 600000,
        departments: ['Oncology', 'Radiology', 'Nuclear Medicine'],
      },
    }),
  ])

  console.log(`Created ${customers.length} customers`)

  // Create Products
  console.log('Creating products...')
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'MDT-PM-001',
        name: 'Medtronic Pacemaker Azure',
        description: 'Dual-chamber pacemaker with MRI compatibility',
        category: 'cardiac',
        subCategory: 'pacemakers',
        manufacturerId: companies[0].id,
        unitOfMeasure: 'UNIT',
        costPrice: 8500,
        sellingPrice: 12500,
        currency: 'USD',
        minStockLevel: 5,
        reorderPoint: 10,
        leadTimeDays: 30,
        certifications: { FDA: true, CE: true },
      },
    }),
    prisma.product.create({
      data: {
        sku: 'STR-NS-001',
        name: 'Stryker Navigation System',
        description: 'Surgical navigation system for neurosurgery',
        category: 'neurosurgery',
        subCategory: 'navigation',
        manufacturerId: companies[1].id,
        unitOfMeasure: 'UNIT',
        costPrice: 125000,
        sellingPrice: 185000,
        currency: 'USD',
        minStockLevel: 1,
        reorderPoint: 2,
        leadTimeDays: 60,
        certifications: { FDA: true, CE: true },
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BSC-ST-001',
        name: 'Boston Scientific Coronary Stent',
        description: 'Drug-eluting coronary stent system',
        category: 'cardiac',
        subCategory: 'stents',
        manufacturerId: companies[2].id,
        unitOfMeasure: 'BOX',
        costPrice: 1200,
        sellingPrice: 1800,
        currency: 'USD',
        minStockLevel: 50,
        reorderPoint: 100,
        leadTimeDays: 14,
        certifications: { FDA: true, CE: true },
      },
    }),
  ])

  console.log(`Created ${products.length} products`)

  // Create Budgets
  console.log('Creating budgets...')
  const masterBudget = await prisma.budget.create({
    data: {
      name: 'FY 2024 Master Budget',
      fiscalYear: 2024,
      type: BudgetType.MASTER,
      status: BudgetStatus.ACTIVE,
      currency: 'KWD',
      totalAmount: 2500000,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      createdById: users[0].id,
      approvedById: users[1].id,
      approvedDate: new Date('2023-12-15'),
    },
  })

  const salesBudget = await prisma.budget.create({
    data: {
      name: 'Sales Department Budget 2024',
      fiscalYear: 2024,
      type: BudgetType.DEPARTMENT,
      department: 'Sales',
      status: BudgetStatus.ACTIVE,
      currency: 'KWD',
      totalAmount: 800000,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      createdById: users[4].id,
      approvedById: users[2].id,
      approvedDate: new Date('2023-12-20'),
    },
  })

  const projectBudget = await prisma.budget.create({
    data: {
      name: 'Q1 Marketing Campaign',
      fiscalYear: 2024,
      type: BudgetType.PROJECT,
      department: 'Marketing',
      status: BudgetStatus.ACTIVE,
      currency: 'KWD',
      totalAmount: 150000,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      createdById: users[4].id,
      approvedById: users[3].id,
      approvedDate: new Date('2023-12-28'),
    },
  })

  console.log('Created 3 budgets')

  // Create Budget Categories
  console.log('Creating budget categories...')
  const masterCategories = await Promise.all([
    prisma.budgetCategory.create({
      data: {
        budgetId: masterBudget.id,
        name: 'Operating Expenses',
        code: 'OE-0001',
        type: CategoryType.EXPENSE,
        allocatedAmount: 500000,
        spentAmount: 375000,
        committedAmount: 50000,
        varianceThreshold: 10,
        requiresApprovalOver: 10000,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        budgetId: masterBudget.id,
        name: 'Salaries & Wages',
        code: 'SW-0001',
        type: CategoryType.EXPENSE,
        allocatedAmount: 800000,
        spentAmount: 600000,
        committedAmount: 0,
        varianceThreshold: 5,
        requiresApprovalOver: 50000,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        budgetId: masterBudget.id,
        name: 'Inventory Purchases',
        code: 'IP-0001',
        type: CategoryType.EXPENSE,
        allocatedAmount: 600000,
        spentAmount: 420000,
        committedAmount: 100000,
        varianceThreshold: 15,
        requiresApprovalOver: 25000,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        budgetId: masterBudget.id,
        name: 'Marketing & Advertising',
        code: 'MA-0001',
        type: CategoryType.EXPENSE,
        allocatedAmount: 300000,
        spentAmount: 270000,
        committedAmount: 20000,
        varianceThreshold: 10,
        requiresApprovalOver: 15000,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        budgetId: masterBudget.id,
        name: 'Capital Expenditure',
        code: 'CE-0001',
        type: CategoryType.CAPITAL,
        allocatedAmount: 200000,
        spentAmount: 150000,
        committedAmount: 30000,
        varianceThreshold: 20,
        requiresApprovalOver: 50000,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        budgetId: masterBudget.id,
        name: 'Sales Revenue',
        code: 'SR-0001',
        type: CategoryType.REVENUE,
        allocatedAmount: 5000000,
        spentAmount: 0,
        committedAmount: 0,
        varianceThreshold: 10,
      },
    }),
  ])

  console.log(`Created ${masterCategories.length} budget categories`)

  // Create Budget Transactions
  console.log('Creating budget transactions...')
  const transactions = await Promise.all([
    prisma.budgetTransaction.create({
      data: {
        budgetCategoryId: masterCategories[2].id, // Inventory
        transactionDate: new Date('2024-01-15'),
        description: 'Cardiac Equipment Purchase - Medtronic',
        amount: 45000,
        transactionType: TransactionType.EXPENSE,
        referenceType: 'PURCHASE_ORDER',
        status: TransactionStatus.APPROVED,
        createdById: users[4].id,
        approvedById: users[3].id,
        approvedDate: new Date('2024-01-16'),
      },
    }),
    prisma.budgetTransaction.create({
      data: {
        budgetCategoryId: masterCategories[3].id, // Marketing
        transactionDate: new Date('2024-01-14'),
        description: 'Trade Show Participation - Dubai',
        amount: 12500,
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.PENDING,
        createdById: users[4].id,
        notes: 'Arab Health 2024 participation',
      },
    }),
    prisma.budgetTransaction.create({
      data: {
        budgetCategoryId: masterCategories[0].id, // Operating
        transactionDate: new Date('2024-01-13'),
        description: 'Office Supplies Q1',
        amount: 2800,
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.APPROVED,
        createdById: users[0].id,
        approvedById: users[3].id,
        approvedDate: new Date('2024-01-13'),
      },
    }),
    prisma.budgetTransaction.create({
      data: {
        budgetCategoryId: masterCategories[0].id, // Operating
        transactionDate: new Date('2024-01-12'),
        description: 'Warehouse Maintenance',
        amount: 8500,
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.APPROVED,
        createdById: users[4].id,
        approvedById: users[3].id,
        approvedDate: new Date('2024-01-12'),
      },
    }),
    prisma.budgetTransaction.create({
      data: {
        budgetCategoryId: masterCategories[1].id, // Salaries
        transactionDate: new Date('2024-01-11'),
        description: 'Sales Team Training Program',
        amount: 15000,
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.PENDING,
        createdById: users[4].id,
        notes: 'Quarterly sales training for team of 10',
      },
    }),
  ])

  console.log(`Created ${transactions.length} transactions`)

  // Create Budget Alerts
  console.log('Creating budget alerts...')
  await Promise.all([
    prisma.budgetAlert.create({
      data: {
        budgetId: masterBudget.id,
        categoryId: masterCategories[3].id, // Marketing
        alertType: AlertType.THRESHOLD_90,
        severity: AlertSeverity.HIGH,
        message: 'Marketing & Advertising budget is at 90% consumption',
        threshold: 90,
        currentValue: 96.67,
        isAcknowledged: false,
      },
    }),
    prisma.budgetAlert.create({
      data: {
        budgetId: salesBudget.id,
        alertType: AlertType.THRESHOLD_80,
        severity: AlertSeverity.MEDIUM,
        message: 'Sales Department budget is at 80% consumption',
        threshold: 80,
        currentValue: 80,
        isAcknowledged: false,
      },
    }),
    prisma.budgetAlert.create({
      data: {
        budgetId: masterBudget.id,
        alertType: AlertType.APPROVAL_PENDING,
        severity: AlertSeverity.LOW,
        message: '5 transactions pending approval for more than 2 days',
        isAcknowledged: false,
      },
    }),
  ])

  console.log('Created 3 budget alerts')

  // Create Tenders
  console.log('Creating tenders...')
  await Promise.all([
    prisma.tender.create({
      data: {
        tenderNumber: 'MOH-2024-001',
        title: 'MOH Cardiac Equipment Tender',
        description: 'Supply of cardiac devices for government hospitals',
        customerId: customers[0].id,
        department: 'Cardiology',
        category: 'cardiac',
        submissionDeadline: new Date('2024-02-15'),
        openingDate: new Date('2024-02-20'),
        estimatedValue: 450000,
        currency: 'KWD',
        status: TenderStatus.IN_PROGRESS,
        bondRequired: true,
        bondAmount: 45000,
        createdById: users[4].id,
      },
    }),
    prisma.tender.create({
      data: {
        tenderNumber: 'MOH-2024-002',
        title: 'Neurosurgery Supplies - Mubarak Hospital',
        description: 'Navigation systems and surgical instruments',
        customerId: customers[0].id,
        department: 'Neurosurgery',
        category: 'neurosurgery',
        submissionDeadline: new Date('2024-03-01'),
        openingDate: new Date('2024-03-05'),
        estimatedValue: 280000,
        currency: 'KWD',
        status: TenderStatus.DRAFT,
        bondRequired: true,
        bondAmount: 28000,
        createdById: users[4].id,
      },
    }),
    prisma.tender.create({
      data: {
        tenderNumber: 'MOH-2023-015',
        title: 'Interventional Radiology Equipment',
        description: 'Supply of IR equipment for Al-Amiri Hospital',
        customerId: customers[1].id,
        department: 'Radiology',
        category: 'radiology',
        submissionDeadline: new Date('2023-11-15'),
        openingDate: new Date('2023-11-20'),
        estimatedValue: 350000,
        currency: 'KWD',
        status: TenderStatus.WON,
        bondRequired: true,
        bondAmount: 35000,
        createdById: users[4].id,
      },
    }),
  ])

  console.log('Created 3 tenders')

  // Create Expenses
  console.log('Creating expenses...')
  await Promise.all([
    prisma.expense.create({
      data: {
        expenseNumber: 'EXP-2024-001',
        category: 'Travel',
        subCategory: 'International',
        description: 'Dubai Trade Show Travel - Sales Team',
        amount: 5500,
        currency: 'KWD',
        expenseDate: new Date('2024-01-20'),
        paymentMethod: 'Bank Transfer',
        budgetCategoryId: masterCategories[3].id,
        status: ExpenseStatus.APPROVED,
        createdById: users[4].id,
        approvedById: users[3].id,
        approvedDate: new Date('2024-01-19'),
      },
    }),
    prisma.expense.create({
      data: {
        expenseNumber: 'EXP-2024-002',
        category: 'Office Supplies',
        description: 'Monthly office supplies',
        amount: 850,
        currency: 'KWD',
        expenseDate: new Date('2024-01-18'),
        paymentMethod: 'Petty Cash',
        budgetCategoryId: masterCategories[0].id,
        status: ExpenseStatus.PAID,
        createdById: users[0].id,
        approvedById: users[3].id,
        approvedDate: new Date('2024-01-18'),
      },
    }),
    prisma.expense.create({
      data: {
        expenseNumber: 'EXP-2024-003',
        category: 'Marketing',
        subCategory: 'Advertising',
        description: 'Social Media Campaign - Q1',
        amount: 8500,
        currency: 'KWD',
        expenseDate: new Date('2024-01-15'),
        paymentMethod: 'Bank Transfer',
        budgetCategoryId: masterCategories[3].id,
        status: ExpenseStatus.PENDING,
        createdById: users[4].id,
        notes: 'Digital advertising budget for Q1',
      },
    }),
  ])

  console.log('Created 3 expenses')

  // Create Invoices
  console.log('Creating invoices...')
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      customerId: customers[0].id,
      invoiceDate: new Date('2024-01-10'),
      dueDate: new Date('2024-04-10'),
      subtotal: 125000,
      taxAmount: 0,
      totalAmount: 125000,
      paidAmount: 0,
      currency: 'KWD',
      status: 'SENT',
      paymentTerms: 'Net 90',
      createdById: users[3].id,
    },
  })

  await prisma.invoiceItem.create({
    data: {
      invoiceId: invoice.id,
      productId: products[0].id,
      description: 'Medtronic Pacemaker Azure - 10 units',
      quantity: 10,
      unitPrice: 12500,
      totalPrice: 125000,
    },
  })

  console.log('Created 1 invoice with items')

  // Create Inventory
  console.log('Creating inventory...')
  await Promise.all([
    prisma.inventory.create({
      data: {
        productId: products[0].id,
        batchNumber: 'MDT-2024-001',
        quantity: 25,
        availableQuantity: 20,
        reservedQuantity: 5,
        location: 'Warehouse A - Shelf 1',
        expiryDate: new Date('2026-01-15'),
        receivedDate: new Date('2024-01-05'),
        unitCost: 8500,
        totalValue: 212500,
        status: 'AVAILABLE',
      },
    }),
    prisma.inventory.create({
      data: {
        productId: products[1].id,
        batchNumber: 'STR-2024-001',
        quantity: 3,
        availableQuantity: 2,
        reservedQuantity: 1,
        location: 'Warehouse B - Bay 2',
        receivedDate: new Date('2024-01-10'),
        unitCost: 125000,
        totalValue: 375000,
        status: 'AVAILABLE',
      },
    }),
    prisma.inventory.create({
      data: {
        productId: products[2].id,
        batchNumber: 'BSC-2024-001',
        quantity: 150,
        availableQuantity: 100,
        reservedQuantity: 50,
        location: 'Warehouse A - Shelf 3',
        expiryDate: new Date('2025-06-30'),
        receivedDate: new Date('2024-01-08'),
        unitCost: 1200,
        totalValue: 180000,
        status: 'AVAILABLE',
      },
    }),
  ])

  console.log('Created 3 inventory items')

  console.log('')
  console.log('Seed completed successfully!')
  console.log('')
  console.log('Test credentials:')
  console.log('  Email: admin@beshara.com')
  console.log('  Password: admin123')
  console.log('')
  console.log('Other test users (same password):')
  console.log('  - ceo@beshara.com')
  console.log('  - cfo@beshara.com')
  console.log('  - finance.manager@beshara.com')
  console.log('  - sales.manager@beshara.com')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
