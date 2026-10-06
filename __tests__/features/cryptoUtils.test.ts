import { sha256, generateRandomSalt } from '../../src/features/security/utils/cryptoUtils';

describe('CryptoUtils - Offline SHA-256 & Salt Generator', () => {
  it('generates a random alphanumeric salt with requested length', () => {
    const salt16 = generateRandomSalt(16);
    expect(salt16).toBeDefined();
    expect(salt16.length).toBe(16);

    const salt32 = generateRandomSalt(32);
    expect(salt32.length).toBe(32);

    // Two consecutive salts should differ
    expect(generateRandomSalt(16)).not.toBe(salt16);
  });

  it('computes correct SHA-256 hash for known strings', () => {
    // Known SHA-256 vectors
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    // sha256("1234") = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
    expect(sha256('1234')).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
  });

  it('produces deterministic output for salted inputs', () => {
    const salt = 'DeviceSalt1234';
    const pin = '9876';
    const input = `${salt}:${pin}`;

    const hash1 = sha256(input);
    const hash2 = sha256(input);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex characters
  });

  it('produces avalanche effect where single bit change completely changes hash', () => {
    const hashA = sha256('UniversalDocs:1234');
    const hashB = sha256('UniversalDocs:1235');

    expect(hashA).not.toBe(hashB);
  });
});
