import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get the absolute path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'climate', 'power_plants_state_aggregates.json');
    
    // Read the file
    const fileContents = fs.readFileSync(filePath, 'utf8');
    
    // Parse and return the JSON data
    const data = JSON.parse(fileContents);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error reading energy data:', error);
    res.status(500).json({ error: 'Failed to load energy data' });
  }
}