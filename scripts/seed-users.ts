import { db } from '../server/db.js';
import * as schema from '../shared/schema.js';
import { hashPassword } from '../server/auth.js';
import { eq } from 'drizzle-orm';

// Clear existing users
async function clearUsers() {
  try {
    console.log('Clearing existing users...');
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    console.log('Users cleared successfully.');
  } catch (error) {
    console.error('Error clearing users:', error);
  }
}

// Seed demo user accounts
async function seedDemoUsers() {
  try {
    console.log('Seeding demo users...');

    // First, we need to get the entity IDs for our demo users
    // We'll get the first company, institution, and personnel record

    const [company] = await db.select().from(schema.companies).limit(1);
    const [institution] = await db.select().from(schema.medicalInstitutions).limit(1);
    const [personnel] = await db.select().from(schema.medicalPersonnel).limit(1);

    if (!company) {
      console.error('No company found. Please run the main seed script first.');
      return;
    }

    // Demo user accounts
    const demoUsers = [
      {
        email: 'admin@medicover.com',
        password: 'admin123',
        userType: 'insurance' as const,
        entityId: company.id,
        isActive: true,
      },
      {
        email: 'insurance.manager@medicover.com',
        password: 'manager123',
        userType: 'insurance' as const,
        entityId: company.id,
        isActive: true,
      },
      {
        email: 'insurance.analyst@medicover.com',
        password: 'analyst123',
        userType: 'insurance' as const,
        entityId: company.id,
        isActive: true,
      }
    ];

    // Add institution user if institution exists
    if (institution) {
      demoUsers.push({
        email: 'hospital@medicover.com',
        password: 'hospital123',
        userType: 'institution' as const,
        entityId: institution.id,
        isActive: true,
      });
    }

    // Add provider user if personnel exists
    if (personnel) {
      demoUsers.push({
        email: 'doctor@medicover.com',
        password: 'doctor123',
        userType: 'provider' as const,
        entityId: personnel.id,
        isActive: true,
      });
    }

    // Hash passwords and create users
    for (const user of demoUsers) {
      try {
        const passwordHash = await hashPassword(user.password);

        await db.insert(schema.users).values({
          email: user.email,
          passwordHash,
          userType: user.userType,
          entityId: user.entityId,
          isActive: user.isActive,
        });

        console.log(`Created ${user.userType} user: ${user.email}`);
      } catch (error) {
        // User might already exist, continue
        console.log(`User ${user.email} might already exist, skipping...`);
      }
    }

    console.log('Demo users seeded successfully!');
  } catch (error) {
    console.error('Error seeding demo users:', error);
  }
}

// Create additional test users for comprehensive testing
async function seedTestUsers() {
  try {
    console.log('Seeding additional test users...');

    // Get existing entities
    const companies = await db.select().from(schema.companies).limit(3);
    const institutions = await db.select().from(schema.medicalInstitutions).limit(3);
    const personnel = await db.select().from(schema.medicalPersonnel).limit(3);

    // Additional insurance users
    if (companies.length > 1) {
      for (let i = 1; i < companies.length; i++) {
        const company = companies[i];
        await createUser(
          `company${i + 1}.admin@test.com`,
          'test123',
          'insurance',
          company.id
        );
      }
    }

    // Additional institution users
    for (let i = 0; i < Math.min(institutions.length, 3); i++) {
      const institution = institutions[i];
      await createUser(
        `institution${i + 1}.admin@test.com`,
        'test123',
        'institution',
        institution.id
      );
    }

    // Additional provider users
    for (let i = 0; i < Math.min(personnel.length, 3); i++) {
      const person = personnel[i];
      await createUser(
        `provider${i + 1}@test.com`,
        'test123',
        'provider',
        person.id
      );
    }

    console.log('Additional test users seeded successfully!');
  } catch (error) {
    console.error('Error seeding test users:', error);
  }
}

// Helper function to create a single user
async function createUser(
  email: string,
  password: string,
  userType: 'insurance' | 'institution' | 'provider',
  entityId: number
) {
  try {
    const passwordHash = await hashPassword(password);

    await db.insert(schema.users).values({
      email,
      passwordHash,
      userType,
      entityId,
      isActive: true,
    });

    console.log(`Created ${userType} user: ${email}`);
  } catch (error) {
    console.log(`User ${email} might already exist, skipping...`);
  }
}

// Main function
async function seedAllUsers() {
  try {
    await clearUsers();
    await seedDemoUsers();
    await seedTestUsers();

    // Verify users were created
    const users = await db.select().from(schema.users);
    console.log(`\nTotal users created: ${users.length}`);

    // Display user summary
    console.log('\n=== DEMO ACCOUNTS ===');
    console.log('Insurance Provider:');
    console.log('  Email: admin@medicover.com');
    console.log('  Password: admin123');
    console.log('  Role: Administrator');

    if (users.some(u => u.userType === 'institution')) {
      console.log('\nMedical Institution:');
      console.log('  Email: hospital@medicover.com');
      console.log('  Password: hospital123');
      console.log('  Role: Institution Admin');
    }

    if (users.some(u => u.userType === 'provider')) {
      console.log('\nHealthcare Provider:');
      console.log('  Email: doctor@medicover.com');
      console.log('  Password: doctor123');
      console.log('  Role: Medical Provider');
    }

    console.log('\n=== ALL USERS CREATED ===');
    users.forEach(user => {
      console.log(`${user.userType}: ${user.email} (${user.isActive ? 'Active' : 'Inactive'})`);
    });

  } catch (error) {
    console.error('Error in seedAllUsers:', error);
  } finally {
    await db.$client.end();
  }
}

// Run the seed function
if (require.main === module) {
  seedAllUsers();
}

export { seedAllUsers };