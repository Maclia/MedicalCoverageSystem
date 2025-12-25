import { validatePremiumData } from '../core/validator';

describe('Premium Calculation Input Validation', () => {
  it('should not throw an error for valid input', () => {
    const validInput = {
      companyId: 123,
      demographics: {
        averageAge: 45,
        ageDistribution: {
          '0-17': 0,
          '18-25': 10,
          '26-35': 20,
          '36-45': 30,
          '46-55': 25,
          '56-65': 15,
          '65+': 0,
        },
        location: {
          state: 'CA',
          costIndex: 1.2,
        },
        industryRisk: 'medium',
        groupSize: 100,
      },
    };
    expect(() => validatePremiumData(validInput)).not.toThrow();
  });

  it('should throw an error for missing companyId', () => {
    const invalidInput = {
      demographics: {
        averageAge: 45,
        ageDistribution: {
          '0-17': 0,
          '18-25': 10,
          '26-35': 20,
          '36-45': 30,
          '46-55': 25,
          '56-65': 15,
          '65+': 0,
        },
        location: {
          state: 'CA',
          costIndex: 1.2,
        },
        industryRisk: 'medium',
        groupSize: 100,
      },
    };
    expect(() => validatePremiumData(invalidInput)).toThrow();
  });

  it('should throw an error for invalid industryRisk', () => {
    const invalidInput = {
      companyId: 123,
      demographics: {
        averageAge: 45,
        ageDistribution: {
          '0-17': 0,
          '18-25': 10,
          '26-35': 20,
          '36-45': 30,
          '46-55': 25,
          '56-65': 15,
          '65+': 0,
        },
        location: {
          state: 'CA',
          costIndex: 1.2,
        },
        industryRisk: 'very-high',
        groupSize: 100,
      },
    };
    expect(() => validatePremiumData(invalidInput)).toThrow();
  });
});
