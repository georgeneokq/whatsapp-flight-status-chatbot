const Dotenv = require('dotenv');
const Server = require('./app/Server');

// Load .env information into process.env
Dotenv.config();

// Create server
const server = new Server();
server.start();