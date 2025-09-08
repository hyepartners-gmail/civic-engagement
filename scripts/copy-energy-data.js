const fs = require('fs');
const path = require('path');

// Source file path
const sourceFilePath = path.join(__dirname, '..', '..', 'python-modeler', 'climate', 'power_plants_state_aggregates.json');

// Destination file path
const destFilePath = path.join(__dirname, '..', 'public', 'climate', 'power_plants_state_aggregates.json');

// Copy the file
try {
  const data = fs.readFileSync(sourceFilePath, 'utf8');
  fs.writeFileSync(destFilePath, data, 'utf8');
  console.log('Successfully copied power_plants_state_aggregates.json to public/climate directory');
} catch (error) {
  console.error('Error copying file:', error);
}