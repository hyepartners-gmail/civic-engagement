import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import path from 'path';
import { promises as fs } from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  if (req.method === 'POST') {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ message: 'Missing "from" or "to" version.' });
    }

    try {
      const jsonDirectory = path.join(process.cwd(), 'public', 'surveys');
      const fromPath = path.join(jsonDirectory, `commonGround_survey_${from}.json`);
      const toPath = path.join(jsonDirectory, `commonGround_survey_${to}.json`);

      const fileContents = await fs.readFile(fromPath, 'utf8');
      const surveyData = JSON.parse(fileContents);
      
      // Update version number within the file
      surveyData.version = to;

      await fs.writeFile(toPath, JSON.stringify(surveyData, null, 2));

      res.status(200).json({ message: `Survey cloned from ${from} to ${to}.` });
    } catch (error) {
      console.error(`Error cloning survey:`, error);
      res.status(500).json({ message: 'Failed to clone survey.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}