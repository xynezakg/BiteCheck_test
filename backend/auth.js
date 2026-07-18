const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('./db');
const { sendEmail } = require('./email');

const JWT_SECRET = process.env.JWT_SECRET || 'ua_super_secret_crypto_key_2026';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Regex to strictly enforce exactly 10 digits (0-9) and nothing else
const isValidUaId = (id) => /^\d{10}$/.test(id);

// Check if input is a valid student ID, admin keyword, or UA email
const isValidLoginInput = (input) => {
    if (!input) return false;
    return input === 'admin' || /^\d{10}$/.test(input) || /^[a-zA-Z0-9._%+-]+@ua\.edu\.ph$/i.test(input);
};

const getVerificationEmailTemplate = (name, verifyUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0C2340; border-bottom: 2px solid #E5A93C; padding-bottom: 10px;">Verify Your UA Identity</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background-color: #0C2340; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border: 1px solid #0C2340; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="font-size: 12px; color: #666;">If the button above does not work, copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; color: #0C2340; word-break: break-all;">${verifyUrl}</p>
            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #999;">This email was sent by the University Canteen Feedback System. If you did not register for an account, please ignore this email.</p>
        </div>
    `;
};

// --- 1. REGISTER ENDPOINT ---
const registerUser = async (req, res) => {
    const { ua_id, full_name, role, password, academic_level, email } = req.body;

    if (role === 'student') {
        return res.status(403).json({ error: 'Student registration is disabled. Please sign in with Google.' });
    }

    // BACKEND VALIDATION: Enforce 10-digit rule
    if (!isValidUaId(ua_id) && role !== 'admin') {
        return res.status(400).json({ error: 'Invalid format. UA ID must be exactly 10 digits with no dashes.' });
    }

    // Validate email domain ending with @ua.edu.ph
    if (role !== 'admin') {
        if (!email || !/^[a-zA-Z0-9._%+-]+@ua\.edu\.ph$/i.test(email)) {
            return res.status(400).json({ error: 'Valid UA email address ending in @ua.edu.ph is required.' });
        }
    }

    // Validate academic_level for students (optional for staff/admin)
    const validLevels = ['JHS', 'SHS', 'College'];
    if (role === 'student' && (!academic_level || !validLevels.includes(academic_level))) {
        return res.status(400).json({ error: 'Academic level is required for students. Please select JHS, SHS, or College.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = role === 'admin' ? null : crypto.randomBytes(20).toString('hex');
        const isEmailVerified = role === 'admin';

        const result = await pool.query(
            'INSERT INTO users (ua_id, full_name, role, password_hash, academic_level, email, is_email_verified, verification_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ua_id, full_name, role, academic_level, email, is_email_verified',
            [ua_id, full_name, role, hashedPassword, academic_level || null, email || null, isEmailVerified, verificationToken]
        );

        const newUser = result.rows[0];

        // Send email verification link if registration is not admin
        if (role !== 'admin' && email) {
            const baseUrl = process.env.BACKEND_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
            const verifyUrl = `${baseUrl}/api/users/verify-email?token=${verificationToken}`;
            const htmlContent = getVerificationEmailTemplate(full_name, verifyUrl);

            const { error: emailErr } = await sendEmail(email, 'Verify Your UA Account', htmlContent);
            if (emailErr) {
                console.error("Failed to send verification email:", emailErr);
                return res.json({ 
                    message: 'User registered, but verification email could not be sent. Please contact support.', 
                    user: newUser 
                });
            }
        }

        res.json({ message: 'User created successfully. A verification email has been sent to your @ua.edu.ph inbox.', user: newUser });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: 'Failed to register user. UA ID or Email might already exist.' });
    }
};

// --- 2. LOGIN ENDPOINT ---
const loginUser = async (req, res) => {
    const { ua_id_or_email, password } = req.body;

    // BACKEND VALIDATION: Prevent unnecessary DB queries if format is wrong
    if (!isValidLoginInput(ua_id_or_email)) { 
        return res.status(400).json({ error: 'Invalid format. Use 10-digit ID or @ua.edu.ph email.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE ua_id = $1 OR email = $1', [ua_id_or_email]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid ID/Email or Password' });

        // Enforce email verification check for non-admin accounts
        if (user.role !== 'admin' && !user.is_email_verified) {
            return res.status(401).json({ error: 'Please verify your email address before logging in.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid ID/Email or Password' });

        const token = jwt.sign(
            { id: user.id, ua_id: user.ua_id, role: user.role, full_name: user.full_name, academic_level: user.academic_level || null, email: user.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { ua_id: user.ua_id, full_name: user.full_name, role: user.role, academic_level: user.academic_level || null }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

const googleLogin = async (req, res) => {
    const { idToken, acceptedToa, academicLevel } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Google ID token is required.' });

    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error("Configuration Error: GOOGLE_CLIENT_ID is not set in backend environment.");
        return res.status(500).json({ error: "Backend configuration error: GOOGLE_CLIENT_ID is missing." });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        
        if (!payload) {
            return res.status(401).json({ error: 'Invalid Google authentication token payload.' });
        }

        // Verify token issuer
        const issuer = payload.iss;
        if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
            return res.status(401).json({ error: 'Invalid token issuer.' });
        }

        // Verify token expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            return res.status(401).json({ error: 'Google token has expired.' });
        }

        // Require email_verified === true
        if (payload.email_verified !== true) {
            return res.status(401).json({ error: 'Unverified Google email address.' });
        }

        const email = payload.email.toLowerCase().trim();
        const name = payload.name;
        const sub = payload.sub;
        const picture = payload.picture || null;

        // Restrict to @ua.edu.ph
        if (!email.endsWith('@ua.edu.ph')) {
            return res.status(403).json({ error: 'Access denied. You must use an official @ua.edu.ph email address.' });
        }

        // Check if user exists by google_sub first, then email
        let userResult = await pool.query('SELECT * FROM users WHERE google_sub = $1', [sub]);
        let user = userResult.rows[0];

        if (!user) {
            userResult = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
            user = userResult.rows[0];
        }

        const isNewGoogleUser = !user || !user.google_sub;
        if (isNewGoogleUser) {
            if (!acceptedToa || !academicLevel || !['JHS', 'SHS', 'College'].includes(academicLevel)) {
                return res.json({ toaRequired: true });
            }
        }

        if (user) {
            // Update the existing user with Google info if missing or outdated, safely
            await pool.query(
                `UPDATE users 
                 SET google_sub = $1, 
                     profile_picture = COALESCE(profile_picture, $2), 
                     full_name = COALESCE(full_name, $3),
                     academic_level = COALESCE(academic_level, $4),
                     is_email_verified = TRUE
                 WHERE id = $5`,
                [sub, picture, name || user.full_name, academicLevel || user.academic_level, user.id]
            );
            // Fetch updated user
            const updatedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
            user = updatedUserResult.rows[0];
        } else {
            // Create user automatically
            const localPart = email.split('@')[0];
            let parsedUaId = null;
            if (/^\d{10}$/.test(localPart)) {
                // Pre-check to make sure this UA ID is not already assigned
                const checkUaId = await pool.query('SELECT id FROM users WHERE ua_id = $1', [localPart]);
                if (checkUaId.rows.length === 0) {
                    parsedUaId = localPart;
                }
            }

            try {
                const insertResult = await pool.query(
                    `INSERT INTO users (ua_id, full_name, role, password_hash, academic_level, email, is_email_verified, google_sub, profile_picture)
                     VALUES ($1, $2, 'student', NULL, $3, $4, TRUE, $5, $6)
                     ON CONFLICT (email) DO UPDATE 
                     SET google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub),
                         profile_picture = COALESCE(users.profile_picture, EXCLUDED.profile_picture),
                         full_name = COALESCE(users.full_name, EXCLUDED.full_name),
                         academic_level = COALESCE(users.academic_level, EXCLUDED.academic_level)
                     RETURNING *`,
                    [parsedUaId, name || 'Student', academicLevel || null, email, sub, picture]
                );
                user = insertResult.rows[0];
            } catch (insertErr) {
                console.warn("Google login insert conflict, retrying select:", insertErr.message);
                const retryResult = await pool.query(
                    'SELECT * FROM users WHERE google_sub = $1 OR LOWER(email) = $2',
                    [sub, email]
                );
                user = retryResult.rows[0];
                if (!user) {
                    throw insertErr;
                }
            }
        }

        // Issue signed local JWT
        const token = jwt.sign(
            { id: user.id, ua_id: user.ua_id, role: user.role, full_name: user.full_name, academic_level: user.academic_level || null, email: user.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { ua_id: user.ua_id, full_name: user.full_name, role: user.role, academic_level: user.academic_level || null }
        });

    } catch (err) {
        console.error("Google authentication error:", err);
        res.status(401).json({ error: 'Invalid Google authentication token.' });
    }
};

// --- 3. SECURITY MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ error: 'Unauthorized. Please log in.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedPayload = jwt.verify(token, JWT_SECRET);
        req.user = decodedPayload;
        next(); 
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    }
};

module.exports = { registerUser, loginUser, requireAuth, googleLogin };