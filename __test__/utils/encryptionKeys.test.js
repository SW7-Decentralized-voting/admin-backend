import { getKeyPair } from '../../utils/encryptionKeys';
import { expect, it } from '@jest/globals';
import * as paillierBigint from 'paillier-bigint';

describe('getKeyPair', () => {
	it('should return an object with a publicKey and privateKey property', async () => {
		const { publicKey, privateKey } = await getKeyPair();
		// Expect to be instance of paillierBigint.PublicKey and paillierBigint.PrivateKey
		expect(publicKey).toBeInstanceOf(paillierBigint.PublicKey);
		expect(privateKey).toBeInstanceOf(paillierBigint.PrivateKey);

	});

	it('should return a different key pair each time it is called', async () => {
		const keyPair1 = await getKeyPair();
		const keyPair2 = await getKeyPair();
		expect(keyPair1).not.toEqual(keyPair2);
	});
});