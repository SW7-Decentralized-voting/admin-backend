import * as paillierBigint from 'paillier-bigint';

/**
 * 
 * @returns {Promise<paillierBigint.KeyPair>} A promise that resolves to a key pair
 */
async function getKeyPair() {
	return paillierBigint.generateRandomKeys(2048);
}

export { getKeyPair };