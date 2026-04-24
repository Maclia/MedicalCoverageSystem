import { claims, diagnosisCodes, medicalInstitutions, medicalPersonnel } from '../../../shared/schema.js';

// Claims schema
export const schema = {
  claims,
  diagnosisCodes,
  medicalInstitutions,
  medicalPersonnel
};

// Export individual tables for direct imports
export { claims, diagnosisCodes, medicalInstitutions, medicalPersonnel };
