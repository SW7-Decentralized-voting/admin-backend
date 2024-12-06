import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import connectDb from '../setup/connect.js';
import { it, jest, expect } from '@jest/globals';
import axios from 'axios';
import Candidate from '../../schemas/Candidate.js';
import populateDb from '../db/testPopulation.js';
import KeyPair from '../../schemas/KeyPair.js';

let router;
const baseRoute = '/api/v1/parties';

const app = express();
app.use(express.json());
app.use(baseRoute, async (req, res, next) => (await router)(req, res, next));

const server = app.listen(0);

beforeAll(async () => {
	connectDb();
	await populateDb();
	router = (await import('../../routes/electionRoutes.js')).default;
});

jest.unstable_mockModule('../../middleware/verifyToken.js', () => {
	return {
		auth: jest.fn((req, res, next) => next()),
	};
});

describe('POST /api/v1/elections/start', () => {
	const testStartElection = async (expectedStatus, mockResponse, expectedMessage) => {
		const spy = jest.spyOn(axios, 'post').mockImplementation(() => {
			if (expectedStatus === 200) {
				return Promise.resolve(mockResponse);
			}
			return Promise.reject(mockResponse);
		});

		const response = await request(app).post(`${baseRoute}/start`);

		expect(response.statusCode).toBe(expectedStatus);
		if (expectedStatus === 200) {
			expect(response.body.message).toBe(expectedMessage);
		} else {
			expect(response.body.error).toBe(expectedMessage);
		}
		expect(spy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ candidates: expect.any(Array), parties: expect.any(Array) })
		);
	};

	it('should return 200 OK when starting an election', async () => {
		await testStartElection(200, { status: 200, data: { message: 'Election started successfully' } }, 'Election started successfully');
	});

	it('should add a key pair to the database when starting an election', async () => {
		await KeyPair.deleteMany();
		await request(app).post(`${baseRoute}/start`);
		const keyPair = await KeyPair.findOne();
		const pubKey = keyPair.publicKey;
		const privKey = keyPair;

		expect(typeof privKey.lambda).toBe('string');
		expect(typeof privKey.mu).toBe('string');
		expect(typeof pubKey.n).toBe('string');
		expect(typeof pubKey.g).toBe('string');

		await KeyPair.deleteMany();
	});

	it('should return 400 Bad Request when starting an election that has already started', async () => {
		await testStartElection(400, { response: { status: 400, data: { error: 'Election has already started' } } }, 'Election has already started');
	});

	it('should return 500 Internal Server Error when blockchain service is unreachable', async () => {
		jest.spyOn(axios, 'post').mockRejectedValue({});
		const response = await request(app).post(`${baseRoute}/start`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Blockchain service cannot be reached');
	});

	it('should return 500 Internal Server Error when starting an election fails', async () => {
		await testStartElection(500, { response: { status: 500, data: { error: 'Unknown error' } } }, 'Unknown error');
	});

	it('should return 500 Internal Server Error when blockchain service gives a 404', async () => {
		await testStartElection(500, { response: { status: 404, data: { error: 'Blockchain service is unreachable' } } }, 'Blockchain service cannot be reached');
	});

	it('should return 500 Internal Server Error when an unexpected error occurs', async () => {
		jest.spyOn(axios, 'post').mockRejectedValue({ response: { status: 500, data: { error: 'Unknown error' } } });
		const response = await request(app).post(`${baseRoute}/start`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Unknown error');
	});

	it('should return 500 Internal Server Error when candidates or parties cannot be fetched', async () => {
		jest.spyOn(Candidate, 'find').mockRejectedValue(new Error('Database error'));
		const response = await request(app).post(`${baseRoute}/start`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Database error');
	});
});

describe('POST /api/v1/elections/advance-phase', () => {
	it('should return 200 OK when advancing the phase of the election', async () => {
		jest.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: { message: 'Phase advanced successfully' } });
		const response = await request(app).post(`${baseRoute}/advance-phase`);
		expect(response.statusCode).toBe(200);
		expect(response.body.message).toBe('Phase advanced successfully');
	});

	it('should return 500 Internal Server Error when blockchain service is unreachable', async () => {
		jest.spyOn(axios, 'post').mockRejectedValue({});
		const response = await request(app).post(`${baseRoute}/advance-phase`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Blockchain service cannot be reached');
	});

	it('should return 400 Bad Request when advancing the phase of the election fails', async () => {
		jest.spyOn(axios, 'post').mockRejectedValue({ response: { status: 400, data: { error: 'Election has not started' } } });
		const response = await request(app).post(`${baseRoute}/advance-phase`);
		expect(response.statusCode).toBe(400);
		expect(response.body.error).toBe('Election has not started');
	});

	it('should return 500 Internal Server Error when blockchain service gives a 404', async () => {
		jest.spyOn(axios, 'post').mockRejectedValue({ response: { status: 404, data: { error: 'Blockchain service is unreachable' } } });
		const response = await request(app).post(`${baseRoute}/advance-phase`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Blockchain service cannot be reached');
	});

	it('should return 500 Internal Server Error when an unexpected error occurs', async () => {
		jest.spyOn(axios, 'post').mockRejectedValue({ response: { status: 500, data: { error: 'Unknown error' } } });
		const response = await request(app).post(`${baseRoute}/advance-phase`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Unknown error');
	});
});

describe('GET /api/v1/elections/phase', () => {
	it('should return the current phase of the election', async () => {
		jest.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { currentPhase: '1' } });
		const response = await request(app).get(`${baseRoute}/phase`);
		expect(response.statusCode).toBe(200);
		expect(response.body.currentPhase).toBe('1');
	});

	it('should return -1 when the election has not started', async () => {
		jest.spyOn(axios, 'get').mockRejectedValue({ response: { data: { error: 'Election has not started' } } });
		const response = await request(app).get(`${baseRoute}/phase`);
		expect(response.statusCode).toBe(200);
		expect(response.body.currentPhase).toBe('-1');
	});

	it('should return 500 Internal Server Error when blockchain service gives a 404', async () => {
		jest.spyOn(axios, 'get').mockRejectedValue({ response: { status: 404, data: { error: 'Blockchain service is unreachable' } } });
		const response = await request(app).get(`${baseRoute}/phase`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Blockchain service cannot be reached');
	});

	it('should return 500 Internal Server Error when blockchain service is unreachable', async () => {
		jest.spyOn(axios, 'get').mockRejectedValue({});
		const response = await request(app).get(`${baseRoute}/phase`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Blockchain service cannot be reached');
	});

	it('should return 500 Internal Server Error when an unexpected error occurs', async () => {
		jest.spyOn(axios, 'get').mockRejectedValue({ response: { status: 500, data: { error: 'Unknown error' } } });
		const response = await request(app).get(`${baseRoute}/phase`);
		expect(response.statusCode).toBe(500);
		expect(response.body.error).toBe('Unknown error');
	});
});

afterAll(async () => {
	await mongoose.connection.close();
	server.close();
});