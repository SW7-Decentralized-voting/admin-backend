import dotenv from 'dotenv';
import axios from 'axios';
import * as e from 'express';
import { getAllCandidates } from '../utils/candidateHelpers.js';
import { getAllParties } from '../utils/partyHelpers.js';
import { getKeyPair } from '../utils/encryptionKeys.js';
import KeyPair from '../schemas/KeyPair.js';

dotenv.config();
const url = process.env.BLOCKCHAIN_URL + '/election';

/**
 * Start an election on the blockchain
 * @param {e.Response} res HTTP response object
 * @returns {e.Response} Success or error message
 */
async function startElection(res) {
  let candidates, parties, keyPair;
  try {
    candidates = await getAllCandidates();
    parties = await getAllParties();
    keyPair = await getKeyPair();
    KeyPair({ publicKey: keyPair.publicKey, privateKey: keyPair.privateKey }).save();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  return await axios.post(`${url}/start`, {
    // Add body with all candidates and parties
    candidates: candidates,
    parties: parties,
    publicKey: keyPair.publicKey
  })
    .then(response => {
      return res.status(200).json(response.data);
    })
    .catch(error => {
      if (!error.response) {
        return res.status(500).json({ error: 'Blockchain service cannot be reached' });
      }
      if (error.response?.status === 404) {
        return res.status(500).json({ error: 'Blockchain service cannot be reached' });
      }
      return res.status(error.response.status).json(error.response.data);
    });
}

export { startElection };
