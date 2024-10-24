import express from 'express';
import { auth } from '../middleware/verifyToken.js';
import { getVotes, getDecryptionKey } from '../controllers/tallying.js';

const router = express.Router();

// Route for tallying votes using HM encryption
router.get('/tally', auth, async (res) => {
  const decryptionKey = await getDecryptionKey(res);
  const votes = await getVotes(res)
  //return tallyVotes(votes, decryptionKey);
});
