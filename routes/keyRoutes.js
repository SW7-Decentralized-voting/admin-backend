import express from 'express';
import { auth } from '../middleware/verifyToken.js';
import { generateKeys, getTotalKeys } from '../controllers/keys.js';

// Queue status
import Queue from 'bull';

const router = express.Router();

router.get('/', (req, res) => {
	getTotalKeys(req, res);
});

router.post('/generate', auth, (req, res) => {
	generateKeys(req, res);
});

router.get('/status/:queueId', async (req, res) => {
	const { queueId } = req.params;

	const keyQueue = new Queue('key-generation-' + queueId);

	const jobCounts = await keyQueue.getJobCounts();
	const total = jobCounts.waiting + jobCounts.active + jobCounts.completed + jobCounts.failed;

	return res.status(200).json({
		total: total,
		waiting: jobCounts.waiting,
		active: jobCounts.active,
		completed: jobCounts.completed,
		failed: jobCounts.failed,
		process: (jobCounts.completed / total * 100).toFixed(2),
	});
});

export default router;