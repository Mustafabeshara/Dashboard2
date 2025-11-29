const { PrismaClient } = require('./node_modules/.prisma/local-client');
const bcrypt = require('bcryptjs');
const os = require('os');
const path = require('path');

async function seedUser() {
  const dbPath = path.join(os.homedir(), 'Library/Application Support/Medical Distribution Dashboard/local.db');
  console.log('DB Path:', dbPath);
  
  const db = new PrismaClient({ 
    datasources: { 
      db: { url: 'file:' + dbPath } 
    } 
  });

  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('Hashed password created');
    
    const user = await db.user.upsert({
      where: { email: 'admin@beshara.com' },
      update: { password: hashedPassword },
      create: { 
        id: 'local-admin-001', 
        email: 'admin@beshara.com', 
        name: 'Admin User', 
        password: hashedPassword, 
        role: 'ADMIN' 
      }
    });
    
    console.log('User seeded:', user.email, user.id);
  } catch (err) { 
    console.error('Error:', err.message); 
  } finally { 
    await db.$disconnect(); 
  }
}

seedUser();
