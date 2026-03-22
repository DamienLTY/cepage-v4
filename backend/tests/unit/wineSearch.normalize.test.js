const { normalize } = require('../../src/lib/wineSearch');

describe('wineSearch.normalize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should lowercase text', () => {
    expect(normalize('BORDEAUX')).toBe('bordeaux');
    expect(normalize('Château')).toBe('chateau');
    expect(normalize('ViNtAgE')).toBe('vintage');
  });

  it('should remove accents', () => {
    expect(normalize('été')).toBe('ete');
    expect(normalize('à')).toBe('a');
    expect(normalize('résumé')).toBe('resume');
    expect(normalize('côté')).toBe('cote');
  });

  it('should handle multi-word strings with accents', () => {
    expect(normalize('été à bordeaux')).toBe('ete a bordeaux');
    expect(normalize('Château Médoc')).toBe('chateau medoc');
  });

  it('should remove non-alphanumeric characters (except spaces)', () => {
    expect(normalize('Château-Lefite')).toBe('chateau lefite');
    expect(normalize('Côte & Vallée')).toBe('cote vallée'); // Special handling for &
    expect(normalize('Test#123')).toBe('test 123');
  });

  it('should normalize multiple spaces to single space', () => {
    expect(normalize('bordeaux   rouge')).toBe('bordeaux rouge');
    expect(normalize('  leading  and  trailing  ')).toBe('leading and trailing');
  });

  it('should trim leading and trailing spaces', () => {
    expect(normalize('  test  ')).toBe('test');
    expect(normalize('   château   ')).toBe('chateau');
  });

  it('should handle empty strings', () => {
    expect(normalize('')).toBe('');
    expect(normalize('   ')).toBe('');
  });

  it('should handle null and undefined', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });

  it('should handle complex real-world examples', () => {
    expect(normalize('Château Pichon Longueville Comtesse de Lalande')).toBe(
      'chateau pichon longueville comtesse de lalande'
    );
    expect(normalize('Côtes du Rhône Peppé & Cie')).toMatch(/cotes du rhone/);
  });
});
