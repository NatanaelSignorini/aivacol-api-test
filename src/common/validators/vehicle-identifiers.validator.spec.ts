import {
  ChassisValidator,
  LicensePlateValidator,
  normalizeChassis,
  normalizeLicensePlate,
  normalizeRenavam,
  RenavamValidator,
} from './vehicle-identifiers.validator';

describe('vehicle-identifiers.validator', () => {
  const licensePlateValidator = new LicensePlateValidator();
  const chassisValidator = new ChassisValidator();
  const renavamValidator = new RenavamValidator();

  describe('normalizeLicensePlate', () => {
    it('strips separators and uppercases', () => {
      expect(normalizeLicensePlate('abc-1d23')).toBe('ABC1D23');
    });
  });

  describe('LicensePlateValidator', () => {
    it('accepts legacy plate', () => {
      expect(licensePlateValidator.validate('ABC1234')).toBe(true);
    });

    it('accepts Mercosul plate', () => {
      expect(licensePlateValidator.validate('ABC1D23')).toBe(true);
    });

    it('rejects invalid plate', () => {
      expect(licensePlateValidator.validate('INVALID')).toBe(false);
    });
  });

  describe('ChassisValidator', () => {
    it('accepts 17-character VIN', () => {
      expect(chassisValidator.validate('9BWZZZ377VT004251')).toBe(true);
    });

    it('rejects short chassis', () => {
      expect(chassisValidator.validate('SHORT')).toBe(false);
    });
  });

  describe('normalizeChassis', () => {
    it('uppercases and removes spaces', () => {
      expect(normalizeChassis('9bwzzz377vt004251')).toBe('9BWZZZ377VT004251');
    });
  });

  describe('RenavamValidator', () => {
    it('accepts 11 digits', () => {
      expect(renavamValidator.validate('12345678901')).toBe(true);
    });

    it('rejects non-numeric renavam', () => {
      expect(renavamValidator.validate('1234567890A')).toBe(false);
    });
  });

  describe('normalizeRenavam', () => {
    it('keeps digits only', () => {
      expect(normalizeRenavam('123.456.789-01')).toBe('12345678901');
    });
  });
});
