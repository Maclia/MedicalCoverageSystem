import { db } from '../server/db';
import * as schema from '../shared/schema';
import { faker } from '@faker-js/faker';

async function seedMedicalProcedures() {
  console.log('Seeding medical procedures...');
  
  // Standard procedure categories from schema
  const categories = [
    'consultation', 'surgery', 'diagnostic', 'laboratory', 'imaging', 
    'dental', 'vision', 'medication', 'therapy', 'emergency', 
    'maternity', 'preventative', 'other'
  ];
  
  // Consultation procedures
  const consultationProcedures = [
    { name: 'General Practitioner Consultation', code: 'CONS001', category: 'consultation', standardRate: 50.00 },
    { name: 'Specialist Consultation', code: 'CONS002', category: 'consultation', standardRate: 100.00 },
    { name: 'Follow-up Consultation', code: 'CONS003', category: 'consultation', standardRate: 35.00 },
    { name: 'Emergency Consultation', code: 'CONS004', category: 'consultation', standardRate: 80.00 },
    { name: 'Telemedicine Consultation', code: 'CONS005', category: 'consultation', standardRate: 40.00 },
  ];
  
  // Diagnostic procedures
  const diagnosticProcedures = [
    { name: 'Complete Blood Count', code: 'DIAG001', category: 'diagnostic', standardRate: 25.00 },
    { name: 'Lipid Profile', code: 'DIAG002', category: 'diagnostic', standardRate: 35.00 },
    { name: 'Liver Function Test', code: 'DIAG003', category: 'diagnostic', standardRate: 40.00 },
    { name: 'Kidney Function Test', code: 'DIAG004', category: 'diagnostic', standardRate: 45.00 },
    { name: 'Thyroid Function Test', code: 'DIAG005', category: 'diagnostic', standardRate: 50.00 },
  ];
  
  // Imaging procedures
  const imagingProcedures = [
    { name: 'X-Ray (Single View)', code: 'IMG001', category: 'imaging', standardRate: 75.00 },
    { name: 'X-Ray (Two Views)', code: 'IMG002', category: 'imaging', standardRate: 110.00 },
    { name: 'Ultrasound', code: 'IMG003', category: 'imaging', standardRate: 150.00 },
    { name: 'CT Scan', code: 'IMG004', category: 'imaging', standardRate: 350.00 },
    { name: 'MRI', code: 'IMG005', category: 'imaging', standardRate: 700.00 },
  ];
  
  // Surgery procedures
  const surgeryProcedures = [
    { name: 'Minor Surgery', code: 'SURG001', category: 'surgery', standardRate: 300.00 },
    { name: 'Appendectomy', code: 'SURG002', category: 'surgery', standardRate: 1500.00 },
    { name: 'Hernia Repair', code: 'SURG003', category: 'surgery', standardRate: 2000.00 },
    { name: 'Cataract Surgery', code: 'SURG004', category: 'surgery', standardRate: 1200.00 },
    { name: 'Colonoscopy', code: 'SURG005', category: 'surgery', standardRate: 800.00 },
  ];
  
  // Dental procedures
  const dentalProcedures = [
    { name: 'Dental Cleaning', code: 'DENT001', category: 'dental', standardRate: 70.00 },
    { name: 'Filling', code: 'DENT002', category: 'dental', standardRate: 100.00 },
    { name: 'Root Canal', code: 'DENT003', category: 'dental', standardRate: 400.00 },
    { name: 'Tooth Extraction', code: 'DENT004', category: 'dental', standardRate: 150.00 },
    { name: 'Dental Crown', code: 'DENT005', category: 'dental', standardRate: 600.00 },
  ];
  
  // Vision procedures
  const visionProcedures = [
    { name: 'Eye Examination', code: 'VIS001', category: 'vision', standardRate: 80.00 },
    { name: 'Visual Field Test', code: 'VIS002', category: 'vision', standardRate: 90.00 },
    { name: 'Prescription Glasses', code: 'VIS003', category: 'vision', standardRate: 200.00 },
    { name: 'Contact Lens Fitting', code: 'VIS004', category: 'vision', standardRate: 120.00 },
    { name: 'Glaucoma Screening', code: 'VIS005', category: 'vision', standardRate: 100.00 },
  ];
  
  // Laboratory procedures
  const laboratoryProcedures = [
    { name: 'Urinalysis', code: 'LAB001', category: 'laboratory', standardRate: 20.00 },
    { name: 'Stool Analysis', code: 'LAB002', category: 'laboratory', standardRate: 25.00 },
    { name: 'Bacteria Culture', code: 'LAB003', category: 'laboratory', standardRate: 50.00 },
    { name: 'Biopsy Analysis', code: 'LAB004', category: 'laboratory', standardRate: 100.00 },
    { name: 'Genetic Testing', code: 'LAB005', category: 'laboratory', standardRate: 300.00 },
  ];
  
  // Combine all procedures
  const allProcedures = [
    ...consultationProcedures,
    ...diagnosticProcedures,
    ...imagingProcedures,
    ...surgeryProcedures,
    ...dentalProcedures,
    ...visionProcedures,
    ...laboratoryProcedures
  ];
  
  // Add descriptions and other fields
  const proceduresWithDescription = allProcedures.map(proc => ({
    ...proc,
    description: `Standard ${proc.name} procedure as per medical guidelines.`,
    active: true,
  }));
  
  // Insert all procedures
  await db.insert(schema.medicalProcedures).values(proceduresWithDescription);
  
  console.log(`Seeded ${proceduresWithDescription.length} medical procedures`);
}

async function seedProviderProcedureRates() {
  console.log('Seeding provider procedure rates...');
  
  // Get all institutions
  const institutions = await db.select().from(schema.medicalInstitutions);
  
  // Get all procedures
  const procedures = await db.select().from(schema.medicalProcedures);
  
  const providerRates = [];
  
  // For each institution, create rates for a subset of procedures
  for (const institution of institutions) {
    // Select a random subset of procedures for this institution (30-70% of all procedures)
    const selectedProcedureCount = Math.floor(procedures.length * (0.3 + Math.random() * 0.4));
    const selectedProcedures = faker.helpers.arrayElements(procedures, selectedProcedureCount);
    
    for (const procedure of selectedProcedures) {
      // Calculate a rate that's +/- 20% of the standard rate
      const rateVariance = 0.8 + (Math.random() * 0.4); // Between 0.8 and 1.2
      const agreedRate = parseFloat((procedure.standardRate * rateVariance).toFixed(2));
      
      // Determine if this rate has an expiry (20% chance)
      const hasExpiry = Math.random() < 0.2;
      const effectiveDate = faker.date.past();
      const expiryDate = hasExpiry ? faker.date.future() : null;
      
      providerRates.push({
        institutionId: institution.id,
        procedureId: procedure.id,
        agreedRate,
        effectiveDate,
        expiryDate,
        active: true,
        notes: `Negotiated rate for ${procedure.name} at ${institution.name}.`,
      });
    }
  }
  
  // Insert all provider rates
  await db.insert(schema.providerProcedureRates).values(providerRates);
  
  console.log(`Seeded ${providerRates.length} provider procedure rates`);
}

async function seedAll() {
  try {
    await seedMedicalProcedures();
    await seedProviderProcedureRates();
    console.log('Medical procedures and provider rates seeded successfully');
  } catch (err) {
    console.error('Error seeding medical procedures data:', err);
  } finally {
    process.exit(0);
  }
}

seedAll();