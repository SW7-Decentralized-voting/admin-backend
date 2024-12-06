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
  let candidates, parties, publicKey, privateKey, publicKeyString;
  try {
    candidates = await getAllCandidates();
    parties = await getAllParties();
    ({ publicKey, privateKey } = await getKeyPair());

    KeyPair({
      lambda: privateKey.lambda.toString(),
      mu: privateKey.mu.toString(),
      publicKey: {
        n: publicKey.n.toString(),
        g: publicKey.g.toString()
      }
    }).save();

    publicKeyString = JSON.stringify({
      n: publicKey.n.toString(),
      g: publicKey.g.toString()
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  return await axios.post(`${url}/start`, {
    // Add body with all candidates and parties
    candidates: candidates,
    parties: parties,
    publicKey: publicKeyString
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

/**
 * Advance the phase of the election on the blockchain
 * @param {e.Response} res Express response object
 * @returns {e.Response} Success or error message
 */
async function advancePhase(res) {
  return await axios.post(`${url}/advance-phase`)
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

/**
 * Fetch the current phase of the election from the blockchain
 * @param {e.Response} res Express response object
 * @returns {e.Response} The current phase of the election or an error message
 */
async function fetchPhase(res) {
  axios.get(`${url}/current-phase`)
    .then(response => {
      return res.status(200).json(response.data);
    })
    .catch(error => {
      if (!error.response) {
        return res.status(500).json({ error: 'Blockchain service cannot be reached' });
      }
      if (error.response?.data?.error === 'Election has not started') {
        return res.status(200).json({ currentPhase: '-1' });
      }
      if (error.response?.status === 404) {
        return res.status(500).json({ error: 'Blockchain service cannot be reached' });
      }
      return res.status(error.response.status).json(error.response.data);
    });
}

export { startElection, advancePhase, fetchPhase };
