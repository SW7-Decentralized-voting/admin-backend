import { generateKeyPair } from 'crypto';

/**
 * 
 * @returns {Promise<{publicKey: string, privateKey: string}>} Public and private key pair
 */
function getKeyPair() {
	return new Promise((resolve, reject) => {
		generateKeyPair('rsa', {
			modulusLength: 2048,  // Length of the key in bits
			publicKeyEncoding: {
				type: 'spki',       // Recommended to be 'spki' by the Node.js docs
				format: 'pem'       // Format of the key
			},
			privateKeyEncoding: {
				type: 'pkcs8',      // Recommended to be 'pkcs8' by the Node.js docs
				format: 'pem'       // Format of the key
			}
		}, (err, publicKey, privateKey) => {
			if (err) {
				reject(err);
			} else {
				resolve({ publicKey, privateKey });
			}
		});
	});
}

export { getKeyPair };