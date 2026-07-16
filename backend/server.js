require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { keyPairFromSeed } = require('./eddsa');

const app = express();

// Set up CORS - Allow requests from local dev, mobile app, vercel, or Hostinger subdomain
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests from any origin to support Hostinger deployments and mobile app builds
        callback(null, true);
    },
    credentials: true
}));

// CRITICAL FIX: Allow the server to accept large Base64 photos without crashing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api', routes);
if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = app;