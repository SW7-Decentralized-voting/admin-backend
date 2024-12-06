import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import connectDb from '../setup/connect.js';
import { describe, jest } from '@jest/globals';
import populateDb from '../db/testPopulation.js';
import PollingStation from '../../schemas/PollingStation.js';
import Key from '../../schemas/Key.js';
import axios from 'axios';

let router;
const baseRoute = '/api/v1/keys';

const app = express();
app.use(express.json());
app.use(baseRoute, async (req, res, next) => (await router)(req, res, next));

const server = app.listen(0);

beforeAll(async () => {
	connectDb();
	router = (await import('../../routes/keyRoutes.js')).default;

	await populateDb();
});

jest.unstable_mockModule('../../middleware/verifyToken.js', () => {
	return {
		auth: jest.fn((req, res, next) => next()),
	};
});

jest.unstable_mockModule('bull', () => {
	const mockAdd = jest.fn();
	const mockProcess = jest.fn();

	const mockQueue = jest.fn().mockImplementation(() => ({
		add: mockAdd,
		process: mockProcess,
		getJobCounts: jest.fn(() => ({
			waiting: 0,
			active: 0,
			completed: 18,
			failed: 0,
		})),
	}));

	return {
		default: mockQueue,
	};
});

const testInternalServerError = async (method, url, mockFunction, expectedMessage) => {
	mockFunction();
	jest.spyOn(console, 'error').mockImplementation(() => { });

	const response = await request(app)[method](url);

	expect(response.statusCode).toBe(500);
	expect(response.body).toEqual({
		status: 'error',
		error: expectedMessage,
	});
};

describe('GET /api/v1/keys/generate', () => {
	jest.spyOn(axios, 'get').mockResolvedValue({ data: { currentPhase: '0' } });
	it('should return 202 Accepted when generating keys', async () => {
		const response = await request(app).post(`${baseRoute}/generate`);

		expect(response.statusCode).toBe(202);
		expect(response.body).toEqual({
			message: 'Key generation started',
			statusLink: expect.stringMatching(/http:\/\/localhost:\d+\/api\/v1\/keys\/status\/[a-f0-9-]+/),
		});
	});

	it('should return 202 Accepted when generating keys with polling stations', async () => {
		const pollingStation = await PollingStation.findOne();

		const response = await request(app).post(`${baseRoute}/generate`).send({
			pollingStations: [pollingStation._id],
		});

		expect(response.statusCode).toBe(202);
		expect(response.body).toEqual({
			message: 'Key generation started',
			statusLink: expect.stringMatching(/http:\/\/localhost:\d+\/api\/v1\/keys\/status\/[a-f0-9-]+/),
		});
	});

	it('should return 202 Accepted when generating keys before election starts', async () => {
		jest.spyOn(axios, 'get').mockRejectedValueOnce({ response: { data: { error: 'Election has not started' } } });

		const response = await request(app).post(`${baseRoute}/generate`);

		expect(response.statusCode).toBe(202);
		expect(response.body).toEqual({
			message: 'Key generation started',
			statusLink: expect.stringMatching(/http:\/\/localhost:\d+\/api\/v1\/keys\/status\/[a-f0-9-]+/),
		});
	});

	it('should return 400 Bad Request when generating keys with invalid polling stations', async () => {
		const response = await request(app).post(`${baseRoute}/generate`).send({
			pollingStations: ['60a6e1c3d9f4b6f3b8e2e7c7', '60a6e1c3d9f4b6f3b8e2e7c8'],
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toEqual({
			status: 'error',
			error: 'Invalid polling station IDs: 60a6e1c3d9f4b6f3b8e2e7c7, 60a6e1c3d9f4b6f3b8e2e7c8',
		});
	});

	it('should return 400 Bad Request when generating keys outside the key-generation phase', async () => {
		jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: { currentPhase: '1' } });

		const response = await request(app).post(`${baseRoute}/generate`);

		expect(response.statusCode).toBe(400);
		expect(response.body).toEqual({
			status: 'error',
			error: 'Key generation can only be started during the key-generation phase',
		});
	});

	it('should return 500 Internal Server Error when an unexpected error occurs', async () => {
		await testInternalServerError('post', `${baseRoute}/generate`, () => {
			jest.spyOn(axios, 'get').mockRejectedValue(new Error('Unexpected error'));
		}, 'An unexpected error occurred while checking the current phase');
	});
});

describe('GET /api/v1/keys/', () => {
	it('should return the total number of keys', async () => {
		Key.insertMany([...Array(18)].map(() => ({ pollingStation: new mongoose.Types.ObjectId(), keyHash: 'hash' })));
		const response = await request(app).get(`${baseRoute}/`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			totalKeys: 18,
		});
	});

	it('should return 500 Internal Server Error when an unexpected error occurs', async () => {
		await testInternalServerError('get', `${baseRoute}/`, () => {
			jest.spyOn(Key, 'countDocuments').mockRejectedValue(new Error('Unexpected error occurred'));
		}, 'An unexpected error occurred while fetching the total number of keys');
	});
});

describe('GET /api/v1/keys/status/:queueId', () => {
	it('should return the status of the key generation queue', async () => {
		const response = await request(app).get(`${baseRoute}/status/queue-id`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			total: expect.any(Number),
			waiting: expect.any(Number),
			active: expect.any(Number),
			completed: expect.any(Number),
			failed: expect.any(Number),
			process: expect.stringMatching(/\d+\.\d+/),
		});
	});
});

afterAll(async () => {
	await PollingStation.deleteMany({});
	await Key.deleteMany({});
	await mongoose.connection.close();
	server.close();
});