import express from 'express';
import { advancePhase, fetchPhase, startElection } from '../controllers/election.js';
import { auth } from '../middleware/verifyToken.js';

const router = express.Router();

// Route for starting an election with no arguments except a token
router.post('/start', auth, async (req, res) => {
  startElection(res);
});

router.post('/advance-phase', auth, async (req, res) => {
  advancePhase(res);
});

router.get('/phase', auth, async (req, res) => {
  fetchPhase(res);
});

export default router;