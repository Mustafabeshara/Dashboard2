/**
 * Database Seeding Script for Dashboard2
 * Creates comprehensive dummy data for testing all features
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Skip clearing data - just add new records
    console.log('📝 Adding new data to existing database...\n');

    // 1. Create Customers
    console.log('👥 Creating customers...');
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'Ministry of Health Kuwait',
          code: 'MOH-KW-001',
          email: 'procurement@moh.gov.kw',
          phone: '+965 2246 0000',
          address: 'Arabian Gulf Street, Kuwait City',
          city: 'Kuwait City',
          country: 'Kuwait',
          type: 'GOVERNMENT',
          status: 'ACTIVE',
          creditLimit: 5000000,
          paymentTerms: 'Net 90',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Mubarak Al-Kabeer Hospital',
          code: 'MKH-001',
          email: 'supplies@mubarak.health.kw',
          phone: '+965 2531 2000',
          address: 'Jabriya, Kuwait',
          city: 'Jabriya',
          country: 'Kuwait',
          type: 'HOSPITAL',
          status: 'ACTIVE',
          creditLimit: 2000000,
          paymentTerms: 'Net 60',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Al-Amiri Hospital',
          code: 'AAH-001',
          email: 'procurement@alamiri.health.kw',
          phone: '+965 2245 0000',
          address: 'Arabian Gulf Street, Kuwait City',
          city: 'Kuwait City',
          country: 'Kuwait',
          type: 'HOSPITAL',
          status: 'ACTIVE',
          creditLimit: 1500000,
          paymentTerms: 'Net 60',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Farwaniya Hospital',
          code: 'FWH-001',
          email: 'supplies@farwaniya.health.kw',
          phone: '+965 2488 8000',
          address: 'Farwaniya, Kuwait',
          city: 'Farwaniya',
          country: 'Kuwait',
          type: 'HOSPITAL',
          status: 'ACTIVE',
          creditLimit: 1000000,
          paymentTerms: 'Net 60',
        },
      }),
      prisma.customer.create({
        data: {
          name: 'Sabah Medical Center',
          code: 'SMC-001',
          email: 'admin@sabahmedical.com',
          phone: '+965 2220 0000',
          address: 'Salmiya, Kuwait',
          city: 'Salmiya',
          country: 'Kuwait',
          type: 'PRIVATE',
          status: 'ACTIVE',
          creditLimit: 500000,
          paymentTerms: 'Net 30',
        },
      }),
    ]);
    console.log(`✅ Created ${customers.length} customers\n`);

    // 2. Create Suppliers
    console.log('🏭 Creating suppliers...');
    const suppliers = await Promise.all([
      prisma.supplier.create({
        data: {
          name: 'Medtronic Middle East',
          code: 'MDT-ME-001',
          email: 'sales@medtronic.me',
          phone: '+971 4 366 7300',
          address: 'Dubai Healthcare City',
          city: 'Dubai',
          country: 'UAE',
          category: 'MEDICAL_DEVICES',
          status: 'ACTIVE',
          paymentTerms: 'Net 45',
          rating: 5,
        },
      }),
      prisma.supplier.create({
        data: {
          name: 'Johnson & Johnson Medical',
          code: 'JNJ-001',
          email: 'orders@jnj-medical.com',
          phone: '+1 800 526 3967',
          address: 'New Brunswick, NJ',
          city: 'New Brunswick',
          country: 'USA',
          category: 'MEDICAL_DEVICES',
          status: 'ACTIVE',
          paymentTerms: 'Net 60',
          rating: 5,
        },
      }),
      prisma.supplier.create({
        data: {
          name: 'Siemens Healthineers',
          code: 'SIE-HE-001',
          email: 'contact@siemens-healthineers.com',
          phone: '+49 9131 84 0',
          address: 'Erlangen, Germany',
          city: 'Erlangen',
          country: 'Germany',
          category: 'IMAGING_EQUIPMENT',
          status: 'ACTIVE',
          paymentTerms: 'Net 60',
          rating: 5,
        },
      }),
      prisma.supplier.create({
        data: {
          name: 'GE Healthcare',
          code: 'GEH-001',
          email: 'sales@gehealthcare.com',
          phone: '+1 262 544 3011',
          address: 'Chicago, IL',
          city: 'Chicago',
          country: 'USA',
          category: 'IMAGING_EQUIPMENT',
          status: 'ACTIVE',
          paymentTerms: 'Net 60',
          rating: 4,
        },
      }),
      prisma.supplier.create({
        data: {
          name: 'Pfizer Pharmaceuticals',
          code: 'PFZ-001',
          email: 'orders@pfizer.com',
          phone: '+1 212 733 2323',
          address: 'New York, NY',
          city: 'New York',
          country: 'USA',
          category: 'PHARMACEUTICALS',
          status: 'ACTIVE',
          paymentTerms: 'Net 30',
          rating: 5,
        },
      }),
      prisma.supplier.create({
        data: {
          name: 'B. Braun Medical',
          code: 'BBR-001',
          email: 'sales@bbraun.com',
          phone: '+49 5661 71 0',
          address: 'Melsungen, Germany',
          city: 'Melsungen',
          country: 'Germany',
          category: 'MEDICAL_SUPPLIES',
          status: 'ACTIVE',
          paymentTerms: 'Net 45',
          rating: 4,
        },
      }),
    ]);
    console.log(`✅ Created ${suppliers.length} suppliers\n`);

    // 3. Create Products
    console.log('📦 Creating products...');
    const products = await Promise.all([
      // Cardiac Equipment
      prisma.product.create({
        data: {
          name: 'Cardiac Catheterization System',
          sku: 'MDT-CCS-2024',
          description: 'Advanced cardiac catheterization system with digital imaging',
          category: 'CARDIOLOGY',
          supplierId: suppliers[0].id,
          unitPrice: 450000,
          costPrice: 380000,
          currency: 'KWD',
          unit: 'UNIT',
          stockQuantity: 2,
          reorderLevel: 1,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'Medtronic',
            model: 'CCS-X5000',
            warranty: '2 years',
            certification: 'CE, FDA',
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'Defibrillator - Automated External',
          sku: 'MDT-AED-3000',
          description: 'Portable automated external defibrillator',
          category: 'CARDIOLOGY',
          supplierId: suppliers[0].id,
          unitPrice: 8500,
          costPrice: 7200,
          currency: 'KWD',
          unit: 'UNIT',
          stockQuantity: 15,
          reorderLevel: 5,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'Medtronic',
            model: 'AED-3000',
            batteryLife: '5 years',
            certification: 'CE, FDA',
          },
        },
      }),
      // Surgical Instruments
      prisma.product.create({
        data: {
          name: 'Neurosurgery Navigation System',
          sku: 'MDT-NNS-7000',
          description: 'Advanced navigation system for neurosurgery procedures',
          category: 'NEUROSURGERY',
          supplierId: suppliers[0].id,
          unitPrice: 280000,
          costPrice: 240000,
          currency: 'KWD',
          unit: 'UNIT',
          stockQuantity: 1,
          reorderLevel: 1,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'Medtronic',
            model: 'StealthStation S8',
            accuracy: '1mm',
            certification: 'CE, FDA',
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'Surgical Instrument Set - General',
          sku: 'JNJ-SIS-100',
          description: 'Complete surgical instrument set for general surgery',
          category: 'SURGERY',
          supplierId: suppliers[1].id,
          unitPrice: 12000,
          costPrice: 9500,
          currency: 'KWD',
          unit: 'SET',
          stockQuantity: 25,
          reorderLevel: 10,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'Johnson & Johnson',
            pieces: '150 instruments',
            material: 'Stainless Steel',
            sterilization: 'Autoclavable',
          },
        },
      }),
      // Imaging Equipment
      prisma.product.create({
        data: {
          name: 'MRI Scanner 3.0 Tesla',
          sku: 'SIE-MRI-3T',
          description: 'High-field MRI scanner with advanced imaging capabilities',
          category: 'RADIOLOGY',
          supplierId: suppliers[2].id,
          unitPrice: 1200000,
          costPrice: 1050000,
          currency: 'KWD',
          unit: 'UNIT',
          stockQuantity: 0,
          reorderLevel: 1,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'Siemens Healthineers',
            model: 'MAGNETOM Vida',
            fieldStrength: '3.0 Tesla',
            bore: '70cm',
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'CT Scanner 128-Slice',
          sku: 'GEH-CT-128',
          description: '128-slice CT scanner with low radiation dose',
          category: 'RADIOLOGY',
          supplierId: suppliers[3].id,
          unitPrice: 850000,
          costPrice: 750000,
          currency: 'KWD',
          unit: 'UNIT',
          stockQuantity: 1,
          reorderLevel: 1,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'GE Healthcare',
            model: 'Revolution CT',
            slices: '128',
            rotation: '0.28s',
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'Ultrasound System - Portable',
          sku: 'GEH-US-P500',
          description: 'Portable ultrasound system with color Doppler',
          category: 'RADIOLOGY',
          supplierId: suppliers[3].id,
          unitPrice: 45000,
          costPrice: 38000,
          currency: 'KWD',
          unit: 'UNIT',
          stockQuantity: 8,
          reorderLevel: 3,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'GE Healthcare',
            model: 'Vivid S70',
            probes: '4 transducers included',
            weight: '6.5 kg',
          },
        },
      }),
      // Pharmaceuticals
      prisma.product.create({
        data: {
          name: 'Antibiotic - Broad Spectrum',
          sku: 'PFZ-ABX-500',
          description: 'Broad spectrum antibiotic for bacterial infections',
          category: 'PHARMACEUTICALS',
          supplierId: suppliers[4].id,
          unitPrice: 25,
          costPrice: 18,
          currency: 'KWD',
          unit: 'BOX',
          stockQuantity: 5000,
          reorderLevel: 1000,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'Pfizer',
            dosage: '500mg',
            packaging: '100 tablets per box',
            storage: 'Room temperature',
          },
        },
      }),
      // Medical Supplies
      prisma.product.create({
        data: {
          name: 'Surgical Gloves - Sterile',
          sku: 'BBR-GLV-S',
          description: 'Sterile surgical gloves, latex-free',
          category: 'SUPPLIES',
          supplierId: suppliers[5].id,
          unitPrice: 15,
          costPrice: 10,
          currency: 'KWD',
          unit: 'BOX',
          stockQuantity: 2000,
          reorderLevel: 500,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'B. Braun',
            material: 'Nitrile',
            sizes: 'Assorted (6.5-8.5)',
            packaging: '50 pairs per box',
          },
        },
      }),
      prisma.product.create({
        data: {
          name: 'IV Catheter Set',
          sku: 'BBR-IVC-20G',
          description: 'Intravenous catheter set with safety features',
          category: 'SUPPLIES',
          supplierId: suppliers[5].id,
          unitPrice: 8,
          costPrice: 5.5,
          currency: 'KWD',
          unit: 'BOX',
          stockQuantity: 3000,
          reorderLevel: 800,
          status: 'ACTIVE',
          specifications: {
            manufacturer: 'B. Braun',
            gauge: '20G',
            length: '1.16 inches',
            packaging: '50 units per box',
          },
        },
      }),
    ]);
    console.log(`✅ Created ${products.length} products\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Suppliers: ${suppliers.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log('\n✅ All done! You can now test the application with realistic data.\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
