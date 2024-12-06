import PollingStation from '../schemas/PollingStation.js';
import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';
import jobHandler from '../utils/jobQueueHandler.js';
import axios from 'axios';
import Key from '../schemas/Key.js';

const baseUrl = 'http://localhost:';
const port = process.env.PORT || 8888;

/**
 * Get the total number of keys generated
 * @param {Request} req Express request object
 * @param {Response} res Express response object to send the response
 * @returns {Response} The total number of keys generated
 */
export async function getTotalKeys(req, res) {
	try {
		const totalKeys = await Key.countDocuments();
		return res.json({
			totalKeys,
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error);
		return res.status(500).json({
			status: 'error',
			error: 'An unexpected error occurred while fetching the total number of keys',
		});
	}
}

/**
 * Start key generation for polling stations in the database or provided in the request body. 
 * The polling stations are added to a queue for processing by the job handler.
 * @param {Request} req Express request object with polling stations in body (optional)
 * @param {Response} res Express response object to send the response
 * @returns {Response} A message indicating that key generation has started
 */
export async function generateKeys(req, res) {
	try {
		await Key.deleteMany({});
		const phase = (await axios.get(process.env.BLOCKCHAIN_URL + '/election/current-phase')).data?.currentPhase;

		if (phase !== '0') {
			return res.status(400).json({
				status: 'error',
				error: 'Key generation can only be started during the key-generation phase',
			});
		}
	} catch (error) {
		if (!error.response) {
			return res.status(500).json({
				status: 'error',
				error: 'An unexpected error occurred while checking the current phase',
			});
		}
	}

	const queueId = uuidv4();
	let pollingStationIds = req.body.pollingStations;

	const keyQueue = new Queue('key-generation-' + queueId);

	if (!pollingStationIds) {
		pollingStationIds = (await PollingStation.find({})).map(station => station._id.toString());
	}

	const pollingStations = await PollingStation.find({ _id: { $in: pollingStationIds } });
	const validStationIds = pollingStations.map(station => station._id.toString());
	const invalidStations = pollingStationIds.filter((id) => !validStationIds.includes(id));
	if (invalidStations.length > 0) {
		return res.status(400).json({
			status: 'error',
			error: 'Invalid polling station IDs: ' + invalidStations.join(', '),
		});
	}

	pollingStations.forEach((station) => {
		keyQueue.add({
			pollingStationId: station._id,
			expectedVoters: station.expectedVoters,
		});
	});


	keyQueue.process(jobHandler);

	return res.status(202).json({
		message: 'Key generation started',
		statusLink: baseUrl + port + '/api/v1/keys/status/' + queueId,
	});
}

/**
 * @import { Request, Response } from 'express';
 */