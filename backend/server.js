require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { keyPairFromSeed } = require('./eddsa');

const app = express();

// Set up CORS - Strictly allow only your frontend URLs
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const isAllowed = origin === 'http://localhost:3000' || 
                          origin.startsWith('http://localhost:') || 
                          origin.endsWith('.vercel.app') || 
                          origin.includes('vercel.app');
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(null, false);
        }
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