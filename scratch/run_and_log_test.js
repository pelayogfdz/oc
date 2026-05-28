const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'test_runs.log');

console.log("Starting test run logging...");

exec('node scratch/continuous_test.js', (error, stdout, stderr) => {
  const timestamp = new Date().toISOString();
  let logContent = `\n=========================================\n`;
  logContent += `TEST RUN AT: ${timestamp}\n`;
  logContent += `=========================================\n`;
  
  if (stdout) {
    logContent += `STDOUT:\n${stdout}\n`;
  }
  if (stderr) {
    logContent += `STDERR:\n${stderr}\n`;
  }
  if (error) {
    logContent += `ERROR EXECUTING: ${error.message}\n`;
  } else {
    logContent += `STATUS: SUCCESS (Exit Code 0)\n`;
  }
  
  fs.appendFileSync(logFilePath, logContent, 'utf8');
  console.log(`Test run logged to ${logFilePath}`);
});
