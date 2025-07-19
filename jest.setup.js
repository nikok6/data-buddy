const { config } = require('dotenv');
const path = require('path');

// Load test environment variables from .env.test
config({ path: path.resolve(__dirname, '.env.test') }); 