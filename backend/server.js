require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { keyPairFromSeed } = require('./eddsa');

const app = express();

// Set up CORS - Strictly allow only your frontend URLs
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://bite-check-backend.vercel.app/',
        'https://bite-check-frontend.vercel.app/' // <--- Your Render Frontend
    ],
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