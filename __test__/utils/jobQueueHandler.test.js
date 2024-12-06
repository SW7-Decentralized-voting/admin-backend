import mongoose from 'mongoose';
import connectDb from '../setup/connect.js';
import populateDb from '../db/testPopulation.js';
import PollingStation from '../../schemas/PollingStation.js';
import Key from '../../schemas/Key.js';
import jobHandler from '../../utils/jobQueueHandler.js';
import { jest } from '@jest/globals';

beforeAll(async () => {
	connectDb();

	await populateDb();
});

describe('jobHandler', () => {
	it('should create keys for a polling station', async () => {
		const station = await PollingStation.findOne();
		const expectedVoters = 10;

		await jobHandler({ data: { pollingStationId: station._id, expectedVoters } });

		const keys = await Key.find({ pollingStation: station._id });

		expect(keys).toHaveLength(expectedVoters);
	});

	it('should throw an error if polling station does not exist', async () => {
		const expectedVoters = 10;
		jest.spyOn(console, 'error').mockImplementationOnce(() => { });

		await expect(jobHandler({ data: { pollingStationId: '60d2e4f4d6c5ee001f2d2d3d', expectedVoters } })).rejects.toThrow('Polling station not found: 60d2e4f4d6c5ee001f2d2d3d');
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});