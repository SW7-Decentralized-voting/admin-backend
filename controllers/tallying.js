import dotenv from 'dotenv';
import axios from 'axios';
import * as e from 'express';
import 

dotenv.config();
const url = process.env.BLOCKCHAIN_URL + '/tally';
const key_url = url + '/get-key'

/**
 * Tallies votes using homomorphic decryption
 * @param votes List of votes on blockchain
 * @param key Decryption key for homomorphic tallying
 * @returns {e.Response} voting vectors
**/

async function tallyVotes(votes, key) {
  // TBA
}


/**
 * Get encrypted votes using homomorphic encryption
 * @param {e.Response} res HTTP response object
 * @returns {e.Response} Success message with encrypted votes or error message
 **/

async function getVotes(res) {
  return await axios.get(`${url}`)
    .then(response => {
      return res.status(200).json(response.data);
    })
      .catch(error => {
        if (error.response.status === 404) {
          return res.status(500).json({ error: 'Blockchain cannot be reached'});
        } else if (error.response.status === 400){
          // throw if election is not in tallying phase
          return res.status(400).json(error);
        };
        return res.status(error.response.status).json(error.reponse.data);
      });
}


/**
  * Get decryption key for homomorphic decryption
  * @param {e.Response} res HTTP response object
  * @returns {e.Response} Success message with decrypt key or error message
**/

async function getDecryptionKey(res) {
  return await axios.get(`${key_url}`)
    .then(response => {
      return res.status(200).json(response.data);
    })
      .catch(error => {
        if (error.response.status === 404) {
          return res.status(500).json({ error: 'Blockchain cannot be reached'}); 
        } else if (error.response.status === 400){
          // throw if election is not in tallying phase
          return res.status(400).json(error);
        };
        return res.status(error.response.status).json(error.reponse.data);
      });
}
