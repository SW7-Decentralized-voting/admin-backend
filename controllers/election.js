import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const url = process.env.BLOCKCHAIN_URL + '/election';

/**
 * @param {Express.Request} req Token header and numKeys in body
 * @param {Express.Response} res HTTP response
 * @returns 
 */
export async function startElection(req, res) {
  const voterCount = req.body.voterCount;

  // Validate voterCount
  if (!voterCount || voterCount < 1) {
    return res.status(400).json({ error: 'Invalid number of voters' });
  }

  try {
    const response = await axios.post(
      `${url}/start`,
      { numKeys: voterCount },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
