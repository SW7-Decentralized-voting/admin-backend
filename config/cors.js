import cors from 'cors';

const corsConfig = {
	origin: [
		'http://127.0.0.1:5173',
		'http://localhost:5173',
		'http://130.225.39.55:5173',
	],
	optionsSuccessStatus: 200,
	exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

// Export cors with config
export default cors(corsConfig);
