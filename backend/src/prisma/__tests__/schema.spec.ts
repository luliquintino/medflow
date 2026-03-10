import { Prisma } from '@prisma/client';

describe('Prisma Schema', () => {
  const dmmf = Prisma.dmmf;

  describe('models', () => {
    const modelNames = dmmf.datamodel.models.map((m) => m.name);

    it('should have all required models', () => {
      const expectedModels = [
        'User',
        'RefreshToken',
        'FinancialProfile',
        'WorkProfile',
        'Shift',
        'Hospital',
        'ShiftTemplate',
        'RiskHistory',
        'Subscription',
        'WearableData',
      ];

      for (const model of expectedModels) {
        expect(modelNames).toContain(model);
      }
    });

    it('should have at least 10 models', () => {
      expect(modelNames.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('enums via field references', () => {
    // Prisma 7 DMMF no longer lists enums in datamodel.enums
    // Instead, enum types are referenced via kind:'enum' on fields
    const allFields = dmmf.datamodel.models.flatMap((m) => m.fields);
    const enumTypes = [...new Set(allFields.filter((f) => f.kind === 'enum').map((f) => f.type))];

    it('should reference ShiftType enum', () => {
      expect(enumTypes).toContain('ShiftType');
    });

    it('should reference ShiftStatus enum', () => {
      expect(enumTypes).toContain('ShiftStatus');
    });

    it('should reference RiskLevel enum', () => {
      expect(enumTypes).toContain('RiskLevel');
    });

    it('should reference Gender enum', () => {
      expect(enumTypes).toContain('Gender');
    });

    it('should reference SubscriptionPlan enum', () => {
      expect(enumTypes).toContain('SubscriptionPlan');
    });

    it('should reference SubscriptionStatus enum', () => {
      expect(enumTypes).toContain('SubscriptionStatus');
    });

    it('should reference ShiftTemplateType enum', () => {
      expect(enumTypes).toContain('ShiftTemplateType');
    });

    it('should reference at least 7 distinct enum types', () => {
      expect(enumTypes.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Shift model fields', () => {
    const shiftModel = dmmf.datamodel.models.find((m) => m.name === 'Shift');
    const fields = shiftModel?.fields ?? [];

    it('should have realized field', () => {
      const realizedField = fields.find((f) => f.name === 'realized');
      expect(realizedField).toBeDefined();
    });

    it('should have realized field as Boolean type', () => {
      const realizedField = fields.find((f) => f.name === 'realized');
      expect(realizedField?.type).toBe('Boolean');
    });

    it('should have realized field as scalar', () => {
      const realizedField = fields.find((f) => f.name === 'realized');
      expect(realizedField?.kind).toBe('scalar');
    });

    it('should have userId field', () => {
      const userIdField = fields.find((f) => f.name === 'userId');
      expect(userIdField).toBeDefined();
      expect(userIdField?.type).toBe('String');
    });

    it('should have status field with ShiftStatus enum type', () => {
      const statusField = fields.find((f) => f.name === 'status');
      expect(statusField).toBeDefined();
      expect(statusField?.type).toBe('ShiftStatus');
      expect(statusField?.kind).toBe('enum');
    });

    it('should have value field as Float', () => {
      const valueField = fields.find((f) => f.name === 'value');
      expect(valueField).toBeDefined();
      expect(valueField?.type).toBe('Float');
    });

    it('should have date field as DateTime', () => {
      const dateField = fields.find((f) => f.name === 'date');
      expect(dateField?.type).toBe('DateTime');
    });

    it('should have type field as ShiftType enum', () => {
      const typeField = fields.find((f) => f.name === 'type');
      expect(typeField?.type).toBe('ShiftType');
      expect(typeField?.kind).toBe('enum');
    });

    it('should have location field as String', () => {
      const locationField = fields.find((f) => f.name === 'location');
      expect(locationField).toBeDefined();
      expect(locationField?.type).toBe('String');
    });

    it('should have hours field as Int', () => {
      const hoursField = fields.find((f) => f.name === 'hours');
      expect(hoursField).toBeDefined();
      expect(hoursField?.type).toBe('Int');
    });
  });

  describe('Shift model relations', () => {
    const shiftModel = dmmf.datamodel.models.find((m) => m.name === 'Shift');
    const fields = shiftModel?.fields ?? [];

    it('should have relation to User', () => {
      const userField = fields.find((f) => f.name === 'user');
      expect(userField).toBeDefined();
      expect(userField?.type).toBe('User');
      expect(userField?.kind).toBe('object');
    });

    it('should have relation to Hospital', () => {
      const hospitalField = fields.find((f) => f.name === 'hospital');
      expect(hospitalField).toBeDefined();
      expect(hospitalField?.type).toBe('Hospital');
      expect(hospitalField?.kind).toBe('object');
    });

    it('should have hospitalId field', () => {
      const hospitalIdField = fields.find((f) => f.name === 'hospitalId');
      expect(hospitalIdField).toBeDefined();
      expect(hospitalIdField?.type).toBe('String');
    });
  });

  describe('User model fields', () => {
    const userModel = dmmf.datamodel.models.find((m) => m.name === 'User');
    const fields = userModel?.fields ?? [];

    it('should have gender field with Gender enum type', () => {
      const genderField = fields.find((f) => f.name === 'gender');
      expect(genderField).toBeDefined();
      expect(genderField?.type).toBe('Gender');
      expect(genderField?.kind).toBe('enum');
    });

    it('should have email field', () => {
      const emailField = fields.find((f) => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.type).toBe('String');
    });

    it('should have name field', () => {
      const nameField = fields.find((f) => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField?.type).toBe('String');
    });

    it('should have crm field', () => {
      const crmField = fields.find((f) => f.name === 'crm');
      expect(crmField).toBeDefined();
    });

    it('should have relation to shifts', () => {
      const shiftsField = fields.find((f) => f.name === 'shifts');
      expect(shiftsField).toBeDefined();
      expect(shiftsField?.type).toBe('Shift');
      expect(shiftsField?.kind).toBe('object');
    });

    it('should have relation to hospitals', () => {
      const hospitalsField = fields.find((f) => f.name === 'hospitals');
      expect(hospitalsField).toBeDefined();
      expect(hospitalsField?.type).toBe('Hospital');
      expect(hospitalsField?.kind).toBe('object');
    });

    it('should have relation to wearableData', () => {
      const wearableField = fields.find((f) => f.name === 'wearableData');
      expect(wearableField).toBeDefined();
      expect(wearableField?.type).toBe('WearableData');
      expect(wearableField?.kind).toBe('object');
    });
  });

  describe('Hospital model', () => {
    const hospitalModel = dmmf.datamodel.models.find((m) => m.name === 'Hospital');
    const fields = hospitalModel?.fields ?? [];

    it('should have relation to ShiftTemplate', () => {
      const templatesField = fields.find((f) => f.name === 'templates');
      expect(templatesField).toBeDefined();
      expect(templatesField?.type).toBe('ShiftTemplate');
      expect(templatesField?.kind).toBe('object');
    });

    it('should have relation to Shift', () => {
      const shiftsField = fields.find((f) => f.name === 'shifts');
      expect(shiftsField).toBeDefined();
      expect(shiftsField?.type).toBe('Shift');
      expect(shiftsField?.kind).toBe('object');
    });

    it('should have userId field', () => {
      const userIdField = fields.find((f) => f.name === 'userId');
      expect(userIdField).toBeDefined();
      expect(userIdField?.type).toBe('String');
    });

    it('should have name field', () => {
      const nameField = fields.find((f) => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField?.type).toBe('String');
    });
  });

  describe('FinancialProfile model', () => {
    const fpModel = dmmf.datamodel.models.find((m) => m.name === 'FinancialProfile');
    const fields = fpModel?.fields ?? [];

    it('should have userId field', () => {
      const userIdField = fields.find((f) => f.name === 'userId');
      expect(userIdField).toBeDefined();
      expect(userIdField?.type).toBe('String');
    });
  });

  describe('RiskHistory model', () => {
    const rhModel = dmmf.datamodel.models.find((m) => m.name === 'RiskHistory');
    const fields = rhModel?.fields ?? [];

    it('should have riskLevel field as RiskLevel enum', () => {
      const riskLevelField = fields.find((f) => f.name === 'riskLevel');
      expect(riskLevelField).toBeDefined();
      expect(riskLevelField?.type).toBe('RiskLevel');
      expect(riskLevelField?.kind).toBe('enum');
    });

    it('should have relation to User', () => {
      const userField = fields.find((f) => f.name === 'user');
      expect(userField).toBeDefined();
      expect(userField?.type).toBe('User');
      expect(userField?.kind).toBe('object');
    });
  });

  describe('Subscription model', () => {
    const subModel = dmmf.datamodel.models.find((m) => m.name === 'Subscription');
    const fields = subModel?.fields ?? [];

    it('should have plan field as SubscriptionPlan enum', () => {
      const planField = fields.find((f) => f.name === 'plan');
      expect(planField).toBeDefined();
      expect(planField?.type).toBe('SubscriptionPlan');
      expect(planField?.kind).toBe('enum');
    });

    it('should have status field as SubscriptionStatus enum', () => {
      const statusField = fields.find((f) => f.name === 'status');
      expect(statusField).toBeDefined();
      expect(statusField?.type).toBe('SubscriptionStatus');
      expect(statusField?.kind).toBe('enum');
    });

    it('should have relation to User', () => {
      const userField = fields.find((f) => f.name === 'user');
      expect(userField).toBeDefined();
      expect(userField?.type).toBe('User');
      expect(userField?.kind).toBe('object');
    });
  });
});
