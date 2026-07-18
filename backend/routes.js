const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;

const {
    pool, addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    getFeedbackPhoto,
    getAllStalls, addStall, deleteStall, editStall,
    getStallByToken, verifyStallEmail, getStallById,
    getFeedbacksByStallName, deleteFeedbacksByStallName
} = require('./db');
const { verifySignature } = require('./eddsa');
const { registerUser, loginUser, requireAuth, googleLogin } = require('./auth');
const { generateStoreReport, analyzeFeedbackData } = require('./reportGenerator');
const { sendEmail } = require('./email');
const { sanitizeComment } = require('./utils/profanityFilter');
const bcrypt = require('bcrypt');

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- HELPER: UPLOAD PDF TO CLOUDINARY ---
const uploadPDFToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { 
                resource_type: 'raw', // 'raw' is required for PDFs and non-image files
                folder: 'ua_canteen/reports',
                public_id: filename 
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// --- HELPER: EXTRACT CLOUDINARY PUBLIC ID ---
const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        
        let remaining = parts[1];
        const subparts = remaining.split('/');
        if (subparts[0].match(/^v\d+$/)) {
            subparts.shift(); // Remove version part (e.g. v1783838886)
        }
        
        remaining = subparts.join('/');
        const dotIndex = remaining.lastIndexOf('.');
        if (dotIndex !== -1) {
            remaining = remaining.substring(0, dotIndex);
        }
        return remaining;
    } catch (e) {
        console.error("Failed to parse Cloudinary URL:", e);
        return null;
    }
};

// --- USER EMAIL VERIFICATION ROUTE ---
router.get('/users/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Verification token is required.");

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE verification_token = $1', [token]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).send("Invalid or expired verification token.");
        }

        await pool.query('UPDATE users SET is_email_verified = TRUE, verification_token = NULL WHERE id = $1', [user.id]);

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; max-width: 600px; margin: 50px auto; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="font-size: 50px; color: #10B981; margin-bottom: 20px;">✓</div>
                <h2 style="color: #0C2340; margin-bottom: 10px;">Verification Successful!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                    Thank you <strong>${user.full_name}</strong>. Your UA account email has been verified successfully. You can now log in using either your Student ID or your @ua.edu.ph email address.
                </p>
                <a href="${process.env.FRONTEND_URL || 'https://bite-check-frontend.vercel.app'}/login" style="background-color: #0C2340; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 15px; border: 1px solid #0C2340; display: inline-block;">Go to Login</a>
            </div>
        `);
    } catch (err) {
        console.error("Verification error:", err);
        res.status(500).send("Internal server error during verification.");
    }
});

const getResetPasswordEmailTemplate = (name, resetUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0C2340; border-bottom: 2px solid #E5A93C; padding-bottom: 10px;">Reset Your UA Account Password</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Please click the button below to set a new password. This link is valid for 1 hour:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #0C2340; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border: 1px solid #0C2340; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 12px; color: #666;">If the button above does not work, copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; color: #0C2340; word-break: break-all;">${resetUrl}</p>
            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #999;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
    `;
};

const getResetPasswordPage = (token, errorMsg = "") => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password - University Canteen Gateway</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background-color: #F8FAFC;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                }
                .reset-container {
                    background-color: #FFFFFF;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 420px;
                    width: 90%;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                    border: 1px solid #E2E8F0;
                    text-align: center;
                }
                h2 {
                    color: #0C2340;
                    margin-bottom: 12px;
                    font-size: 24px;
                    font-weight: 700;
                }
                p {
                    color: #64748B;
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 24px;
                }
                .form-group {
                    text-align: left;
                    margin-bottom: 20px;
                }
                label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748B;
                    margin-bottom: 8px;
                    letter-spacing: 0.05em;
                }
                input[type="password"] {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 8px;
                    border: 1px solid #E2E8F0;
                    font-size: 15px;
                    box-sizing: border-box;
                    outline: none;
                    transition: border-color 0.2s;
                }
                input[type="password"]:focus {
                    border-color: #0C2340;
                }
                .btn {
                    width: 100%;
                    padding: 14px;
                    background-color: #0C2340;
                    color: #FFFFFF;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .btn:hover {
                    opacity: 0.9;
                }
                .error {
                    background-color: #FEF2F2;
                    color: #EF4444;
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    margin-bottom: 20px;
                    border: 1px solid #FCA5A5;
                    text-align: left;
                }
            </style>
        </head>
        <body>
            <div class="reset-container">
                <h2>Reset Your Password</h2>
                <p>Please enter your new password below. It must be secure and confidential.</p>
                ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
                <form action="/api/users/reset-password" method="POST">
                    <input type="hidden" name="token" value="${token}">
                    <div class="form-group">
                        <label>NEW PASSWORD</label>
                        <input type="password" name="password" required minlength="6" placeholder="••••••••">
                    </div>
                    <div class="form-group">
                        <label>CONFIRM NEW PASSWORD</label>
                        <input type="password" name="confirmPassword" required minlength="6" placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn">Update Password</button>
                </form>
            </div>
        </body>
        </html>
    `;
};

// --- IDENTITY & AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/auth/google', googleLogin);

// POST `/users/forgot-password`
router.post('/users/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User with this email not found.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const tokenExpires = new Date(Date.now() + 3600000); // 1 hour expiration

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [resetToken, tokenExpires, user.id]
        );

        const baseUrl = process.env.BACKEND_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
        const resetUrl = `${baseUrl}/api/users/reset-password?token=${resetToken}`;
        const htmlContent = getResetPasswordEmailTemplate(user.full_name, resetUrl);

        const { error: emailErr } = await sendEmail(email, 'Reset Your UA Account Password', htmlContent);
        if (emailErr) {
            console.error("Failed to send reset email:", emailErr);
            return res.status(500).json({ error: 'Failed to send password reset email.' });
        }

        res.json({ message: 'Password reset link has been sent to your @ua.edu.ph inbox.' });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: 'Internal server error during password reset request.' });
    }
});

// GET `/users/reset-password`
router.get('/users/reset-password', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Reset token is required.");

    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).send("Invalid or expired password reset token.");
        }

        res.send(getResetPasswordPage(token));
    } catch (error) {
        console.error("Reset password GET error:", error);
        res.status(500).send("Internal server error.");
    }
});

// POST `/users/reset-password` (form submission)
router.post('/users/reset-password', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
        return res.status(400).send(getResetPasswordPage(token, "All fields are required."));
    }

    if (password !== confirmPassword) {
        return res.status(400).send(getResetPasswordPage(token, "Passwords do not match."));
    }

    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).send("Invalid or expired password reset token.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; max-width: 600px; margin: 50px auto; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="font-size: 50px; color: #10B981; margin-bottom: 20px;">✓</div>
                <h2 style="color: #0C2340; margin-bottom: 10px;">Password Reset Successful!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                    Your account password has been updated successfully. You can now close this window and log in with your new credentials.
                </p>
                <a href="${process.env.FRONTEND_URL || 'https://bite-check-frontend.vercel.app'}/login" style="background-color: #0C2340; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 15px; border: 1px solid #0C2340; display: inline-block;">Go to Login</a>
            </div>
        `);
    } catch (error) {
        console.error("Reset password POST error:", error);
        res.status(500).send("Internal server error resetting password.");
    }
});

// --- ADMIN USER DEMOGRAPHICS ROUTE ---
router.get('/admin/user-demographics', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COALESCE(academic_level, 'Unspecified') as level,
                COUNT(*) as count
            FROM users
            WHERE role = 'student'
            GROUP BY academic_level
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Failed to fetch demographics:", err);
        res.status(500).json({ error: 'Server error fetching user demographics' });
    }
});

// --- ADMIN: GET ALL REGISTERED USERS ---
router.get('/admin/users', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }

    try {
        const result = await pool.query(
            'SELECT id, ua_id, full_name, role, academic_level, email, is_email_verified, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Failed to fetch registered users:", err);
        res.status(500).json({ error: "Internal server error fetching users." });
    }
});

// --- ADMIN: DELETE REGISTERED USER ---
router.delete('/admin/users/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ error: "You cannot delete your own admin account!" });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, full_name', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        res.json({ message: "User deleted successfully", user: result.rows[0] });
    } catch (err) {
        console.error("Failed to delete user:", err);
        res.status(500).json({ error: "Internal server error deleting user." });
    }
});

// --- ADMIN: UPDATE USER ACADEMIC LEVEL ---
router.patch('/admin/users/:id/level', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { id } = req.params;
    const { academicLevel } = req.body;
    const validLevels = ['JHS', 'SHS', 'College'];
    if (!validLevels.includes(academicLevel)) {
        return res.status(400).json({ error: "Invalid academic level. Must be JHS, SHS, or College." });
    }
    try {
        const result = await pool.query(
            'UPDATE users SET academic_level = $1 WHERE id = $2 RETURNING id, full_name, academic_level',
            [academicLevel, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        res.json({ message: "Academic level updated successfully", user: result.rows[0] });
    } catch (err) {
        console.error("Failed to update academic level:", err);
        res.status(500).json({ error: "Internal server error updating academic level." });
    }
});

// --- DYNAMIC EVALUATION CRITERIA ROUTES ---

// GET `/criteria` -> returns active criteria names for student form
router.get('/criteria', async (req, res) => {
    try {
        const result = await pool.query('SELECT name FROM criteria WHERE is_active = TRUE ORDER BY id ASC');
        res.json(result.rows.map(row => row.name));
    } catch (err) {
        console.error("Error fetching active criteria:", err);
        res.status(500).json({ error: 'Server error fetching criteria' });
    }
});

// GET `/admin/criteria` -> returns all criteria (active & inactive) for admin management
router.get('/admin/criteria', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    try {
        const result = await pool.query('SELECT * FROM criteria ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching all criteria:", err);
        res.status(500).json({ error: 'Server error fetching criteria' });
    }
});

// POST `/admin/criteria` -> add a new criterion
router.post('/admin/criteria', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Criteria name is required.' });
    
    const cleanName = name.trim();
    if (/[\[\]:|/]/g.test(cleanName)) {
        return res.status(400).json({ error: 'Criteria name contains invalid characters: [ ] : | /' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO criteria (name, is_active) VALUES ($1, TRUE) RETURNING *',
            [cleanName]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A criterion with this name already exists.' });
        }
        console.error("Error creating criterion:", err);
        res.status(500).json({ error: 'Server error creating criterion.' });
    }
});

// PUT `/admin/criteria/:id` -> toggle status (active/inactive)
router.put('/admin/criteria/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { id } = req.params;
    const { is_active, name } = req.body;

    try {
        if (is_active === false) {
            const activeCountResult = await pool.query('SELECT COUNT(*) FROM criteria WHERE is_active = TRUE AND id != $1', [id]);
            if (parseInt(activeCountResult.rows[0].count) === 0) {
                return res.status(400).json({ error: 'Cannot deactivate all criteria. At least one must remain active.' });
            }
        }

        let result;
        if (name !== undefined && is_active !== undefined) {
            result = await pool.query(
                'UPDATE criteria SET is_active = $1, name = $2 WHERE id = $3 RETURNING *',
                [is_active, name, id]
            );
        } else if (name !== undefined) {
            result = await pool.query(
                'UPDATE criteria SET name = $1 WHERE id = $2 RETURNING *',
                [name, id]
            );
        } else {
            result = await pool.query(
                'UPDATE criteria SET is_active = $1 WHERE id = $2 RETURNING *',
                [is_active, id]
            );
        }
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Criterion not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating criterion:", err);
        res.status(500).json({ error: 'Server error updating criterion.' });
    }
});

// DELETE `/admin/criteria/:id` -> delete a criterion
router.delete('/admin/criteria/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { id } = req.params;

    try {
        const checkActive = await pool.query('SELECT is_active FROM criteria WHERE id = $1', [id]);
        if (checkActive.rows.length === 0) {
            return res.status(404).json({ error: 'Criterion not found.' });
        }

        if (checkActive.rows[0].is_active) {
            const activeCountResult = await pool.query('SELECT COUNT(*) FROM criteria WHERE is_active = TRUE AND id != $1', [id]);
            if (parseInt(activeCountResult.rows[0].count) === 0) {
                return res.status(400).json({ error: 'Cannot delete the only active criterion. At least one must remain active.' });
            }
        }

        await pool.query('DELETE FROM criteria WHERE id = $1', [id]);
        res.json({ message: 'Criterion deleted successfully.' });
    } catch (err) {
        console.error("Error deleting criterion:", err);
        res.status(500).json({ error: 'Server error deleting criterion.' });
    }
});

// --- SECURE FEEDBACK ROUTE ---
router.post('/feedback', requireAuth, async (req, res) => {
    let { rating, comment, attachment, signature, public_key, is_anonymous } = req.body;

    let customer_name = req.user.full_name;
    if (is_anonymous) {
        customer_name = "Anonymous Student";
    }
    const user_id = req.user.id;

    rating = Number(rating);
    comment = comment ? String(comment).trim() : "";
    comment = sanitizeComment(comment);

    console.log('[FEEDBACK DEBUG] rating:', rating, '| comment length:', comment.length, '| has_sig:', !!signature, '| has_key:', !!public_key);

    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    if (!comment) return res.status(400).json({ error: 'Comment required' });
    if (!signature || !public_key) return res.status(400).json({ error: 'Cryptographic signature and public key are required.' });

    const feedbackForVerify = { customer_name, rating, comment };

    try {
        const pubKeyBin = Buffer.from(public_key, 'base64');
        const isValid = verifySignature(pubKeyBin, feedbackForVerify, signature);

        if (!isValid) {
            return res.status(401).json({ error: 'Data integrity check failed: Invalid signature.' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Malformed cryptographic keys provided.' });
    }

    try {
        if (attachment && !attachment.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(attachment, { folder: 'ua_canteen/feedback' });
            attachment = uploadRes.secure_url; 
        }
    } catch (uploadError) {
        console.error("Cloudinary Error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image to cloud storage." });
    }

    try {
        const inserted = await addFeedback({ user_id, customer_name, rating, comment, signature, public_key, attachment, is_anonymous });
        res.status(201).json(inserted);
    } catch (e) {
        console.error("Insert Error:", e.message);
        res.status(500).json({ error: "Database insertion failed." });
    }
});

router.get('/feedbacks', async (req, res) => {
    try {
        const rows = await getAllFeedback();

        const verifiedRows = rows.map(row => {
            const verifyName = row.is_anonymous ? "Anonymous Student" : row.customer_name;
            const feedbackForVerify = {
                customer_name: verifyName,
                rating: row.rating,
                comment: row.comment
            };
            let valid = false;
            try {
                const pubKeyBin = Buffer.from(row.public_key, 'base64');
                valid = verifySignature(pubKeyBin, feedbackForVerify, row.signature);
            } catch (e) {
                valid = false;
            }

            const has_attachment = !!row.attachment;
            delete row.attachment;
            
            // SECURITY: Explicitly strip real student identity keys to prevent leaks in public JSON response
            delete row.student_real_name;
            delete row.student_ua_id;

            // Make it anonymous for the public view
            const finalRow = { ...row, _is_signature_valid: valid, has_attachment };
            if (row.is_anonymous) {
                finalRow.customer_name = "Anonymous Student";
            }

            return finalRow;
        });

        res.json(verifiedRows);
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch feedback." });
    }
});

router.get('/admin/feedbacks', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Admin role required.' });
    }
    try {
        const rows = await getAllFeedback();

        const verifiedRows = rows.map(row => {
            const verifyName = row.is_anonymous ? "Anonymous Student" : row.customer_name;
            const feedbackForVerify = {
                customer_name: verifyName,
                rating: row.rating,
                comment: row.comment
            };
            let valid = false;
            try {
                const pubKeyBin = Buffer.from(row.public_key, 'base64');
                valid = verifySignature(pubKeyBin, feedbackForVerify, row.signature);
            } catch (e) {
                valid = false;
            }

            const has_attachment = !!row.attachment;
            delete row.attachment;

            // Admin gets real name in customer_name even if is_anonymous is true!
            const finalRow = { ...row, _is_signature_valid: valid, has_attachment };
            if (row.is_anonymous && row.student_real_name) {
                finalRow.customer_name = `${row.student_real_name} (Anonymous)`;
            }
            return finalRow;
        });

        res.json(verifiedRows);
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch admin feedback." });
    }
});

router.get('/feedback/:id/photo', async (req, res) => {
    try {
        const row = await getFeedbackPhoto(req.params.id);
        if (row && row.attachment) {
            res.json({ attachment: row.attachment });
        } else {
            res.status(404).json({ error: "No photo found" });
        }
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch photo." });
    }
});

router.post('/verify', async (req, res) => {
    let { id, customer_name, rating, comment, signature, public_key, attachment } = req.body;

    if (!attachment && id) {
        try {
            const photoRow = await getFeedbackPhoto(id);
            if (photoRow) attachment = photoRow.attachment || null;
        } catch (e) { }
    }

    const feedbackForVerify = { customer_name, rating, comment };

    try {
        const pubKeyBin = Buffer.from(public_key, 'base64');
        const valid = verifySignature(pubKeyBin, feedbackForVerify, signature);
        res.json({ valid });
    } catch (e) {
        res.json({ valid: false, error: "Malformed cryptographic data." });
    }
});

router.post('/admin/verify-password', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: "Password required." });
    }
    try {
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Admin account not found." });
        }
        const adminUser = userResult.rows[0];

        const valid = await bcrypt.compare(password, adminUser.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Incorrect admin password." });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Verify Password Error:", err);
        res.status(500).json({ error: "Server error verifying password." });
    }
});

router.post('/admin/feedbacks/purge', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: "Password required." });
    }
    try {
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Admin account not found." });
        }
        const adminUser = userResult.rows[0];

        const valid = await bcrypt.compare(password, adminUser.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Incorrect admin password." });
        }

        const rowsResult = await pool.query('SELECT attachment FROM feedbacks');
        for (const row of rowsResult.rows) {
            if (row.attachment) {
                const publicId = extractPublicId(row.attachment);
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId);
                    } catch (e) {
                        console.error("Cloudinary delete error during purge:", e);
                    }
                }
            }
        }

        await pool.query('DELETE FROM feedbacks');
        res.json({ message: "All feedback records purged successfully." });
    } catch (err) {
        console.error("Purge Error:", err.message);
        res.status(500).json({ error: "Server Error purging records." });
    }
});

router.delete('/feedback/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: "Password required for verification." });
    }
    try {
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Admin account not found." });
        }
        const adminUser = userResult.rows[0];

        const valid = await bcrypt.compare(password, adminUser.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Incorrect admin password." });
        }

        const feedbackPhoto = await getFeedbackPhoto(req.params.id);
        if (feedbackPhoto && feedbackPhoto.attachment) {
            const publicId = extractPublicId(feedbackPhoto.attachment);
            if (publicId) {
                console.log(`[Cloudinary] Deleting feedback photo with public ID: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await deleteFeedback(req.params.id);
        res.json({ message: "Record purged successfully" });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

router.put('/feedback/:id/quarantine', async (req, res) => {
    try {
        await quarantineFeedback(req.params.id);
        res.json({ message: "Record quarantined successfully" });
    } catch (err) {
        console.error("Quarantine Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- PDF REPORT GENERATION ROUTES ---
const getVerifiedFeedbacks = (feedbacks) => {
    return feedbacks.filter(row => {
        const verifyName = row.is_anonymous ? "Anonymous Student" : row.customer_name;
        const feedbackForVerify = {
            customer_name: verifyName,
            rating: row.rating,
            comment: row.comment
        };
        try {
            const pubKeyBin = Buffer.from(row.public_key, 'base64');
            return verifySignature(pubKeyBin, feedbackForVerify, row.signature);
        } catch (e) {
            return false;
        }
    });
};

router.get('/reports/overall', async (req, res) => {
    try {
        const rawFeedbacks = await getAllFeedback();
        const verifiedFeedbacks = getVerifiedFeedbacks(rawFeedbacks);
        const reportData = await analyzeFeedbackData('UA Main Canteen System', verifiedFeedbacks);
        generateStoreReport(reportData, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: "Failed to generate report" });
    }
});

router.get('/reports/stall/:id', async (req, res) => {
    try {
        const stallRows = await getAllStalls();
        const stall = stallRows.find(s => s.id == req.params.id);
        if (!stall) return res.status(404).json({ error: "Stall not found" });

        const rawFeedbacks = await getAllFeedback();
        const verifiedFeedbacks = getVerifiedFeedbacks(rawFeedbacks);
        const stallFeedbacks = verifiedFeedbacks.filter(f => {
            const match = f.comment?.match(/\[Stall: (.*?)\]/);
            return match ? match[1] === stall.name : false;
        });

        const reportData = await analyzeFeedbackData(stall.name, stallFeedbacks);
        generateStoreReport(reportData, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: "Failed to generate stall report" });
    }
});

// --- STALL MANAGEMENT ROUTES ---
router.get('/stalls', async (req, res) => {
    try {
        const rows = await getAllStalls();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/stalls/:id/qrcode', async (req, res) => {
    try {
        const { id } = req.params;
        const stalls = await getAllStalls();
        const stall = stalls.find(s => s.id == id);
        
        if (!stall) {
            return res.status(404).json({ error: 'Stall not found' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://bite-check-frontend.vercel.app';
        const evaluationUrl = `${frontendUrl}/?stall=${encodeURIComponent(stall.name)}`;

        // Generate the QR Code buffer in PNG format
        const qrBuffer = await QRCode.toBuffer(evaluationUrl, {
            type: 'png',
            margin: 2,
            width: 350,
            color: {
                dark: '#0C2340',  // University Navy
                light: '#FFFFFF'  // White background
            }
        });

        res.type('png');
        res.send(qrBuffer);
    } catch (err) {
        console.error("Failed to generate QR Code:", err);
        res.status(500).json({ error: 'Failed to generate QR Code' });
    }
});

router.get('/stalls/verify-email', async (req, res) => {
    const { token } = req.query;
    try {
        const stall = await getStallByToken(token);
        if (!stall) return res.status(400).send('Invalid or expired token.');
        await verifyStallEmail(stall.id);
        res.send('Email verified successfully! You can now close this window.');
    } catch (err) {
        res.status(500).send('Verification failed.');
    }
});

router.post('/stalls/:id/send-report', async (req, res) => {
    try {
        const stallRows = await getAllStalls();
        const stall = stallRows.find(s => s.id == req.params.id);
        if (!stall) return res.status(404).json({ error: "Stall not found" });
        if (!stall.email || !stall.is_email_verified) return res.status(400).json({ error: "Stall does not have a verified email." });

        const rawFeedbacks = await getAllFeedback();
        const verifiedFeedbacks = getVerifiedFeedbacks(rawFeedbacks);
        const stallFeedbacks = verifiedFeedbacks.filter(f => {
            const match = f.comment?.match(/\[Stall: (.*?)\]/);
            return match ? match[1] === stall.name : false;
        });

        const reportData = await analyzeFeedbackData(stall.name, stallFeedbacks);
        
        // Generate the PDF as a buffer
        const pdfBuffer = await generateStoreReport(reportData);

        // Upload to Cloudinary to bypass EmailJS size limits
        const filename = `Evaluation_Report_${stall.name.replace(/\s+/g, '_')}.pdf`;
        const pdfUrl = await uploadPDFToCloudinary(pdfBuffer, filename);

        // Send email with PDF attachment and Cloudinary link
        const htmlContent = `
            <h2>Automated Evaluation Report</h2>
            <p>Hello ${stall.name} owner,</p>
            <p>Here is your automated stall evaluation update based on verified student feedback.</p>
            <h3>AI Summary & Recommendations:</h3>
            <p>${reportData.ai_summary || 'Please find the detailed statistics in your full report.'}</p>
            <p>You can also download your report here: <a href="${pdfUrl}">${pdfUrl}</a></p>
        `;
        
        const { error } = await sendEmail(
            stall.email, 
            `Your Evaluation Report: ${stall.name}`, 
            htmlContent, 
            pdfBuffer,
            filename
        );

        if (error) {
            return res.status(500).json({ error: "Failed to send stall report email." });
        }

        res.json({ success: true, message: "Report sent successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate or send stall report." });
    }
});

const getVerificationEmailTemplate = (name, verifyUrl) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
  <div style="background-color: #0c2340; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">UA Canteen System</h1>
  </div>
  <div style="padding: 30px; background-color: #ffffff; color: #333333;">
    <h2 style="margin-top: 0; color: #0c2340;">Verify Your Stall Account</h2>
    <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
    <p style="font-size: 16px; line-height: 1.5;">You have been registered as the official owner of <strong>${name}</strong>. Please click below to verify.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${verifyUrl}" style="background-color: #e5a823; color: #0c2340; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px; display: inline-block;">Verify Email Address</a>
    </div>
  </div>
</div>
`;

router.post('/stalls', async (req, res) => {
    try {
        let { name, image, email, canteen_group } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        let verificationToken = null;
        if (email) {
            verificationToken = crypto.randomBytes(20).toString('hex');
        }

        const newStall = await addStall(name, image || null, email || null, verificationToken, canteen_group || null);

        if (email) {
            const baseUrl = process.env.BACKEND_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
            const verifyUrl = `${baseUrl}/api/stalls/verify-email?token=${verificationToken}`;
            const htmlContent = getVerificationEmailTemplate(name, verifyUrl);
            
            const { error } = await sendEmail(
                email,
                `Action Required: Verify ${name} Email`,
                htmlContent
            );
            if (error) console.error("\n[Email Error]:", error);
        }

        res.json(newStall);
    } catch (err) {
        if (err.message.toLowerCase().includes("unique")) {
            return res.status(400).json({ error: "Stall already exists" });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/stalls/:id', async (req, res) => {
    try {
        let { name, image, email, canteen_group } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        const existingStall = (await getAllStalls()).find(s => s.id == req.params.id);
        let verificationToken = existingStall.verification_token;
        let isVerified = existingStall.is_email_verified;
        let emailChanged = email !== existingStall.email;

        if (emailChanged && email) {
            verificationToken = crypto.randomBytes(20).toString('hex');
            isVerified = false;
        } else if (!email) {
            verificationToken = null;
            isVerified = false;
        }

        const updatedStall = await editStall(req.params.id, name, image || null, email || null, isVerified, verificationToken, canteen_group || null);

        if (emailChanged && email) {
            const baseUrl = process.env.BACKEND_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
            const verifyUrl = `${baseUrl}/api/stalls/verify-email?token=${verificationToken}`;
            const htmlContent = getVerificationEmailTemplate(name, verifyUrl);
            
            const { error } = await sendEmail(
                email,
                `Action Required: Verify ${name} Email`,
                htmlContent
            );
            if (error) console.error("\n[Email Error]:", error);
        }

        res.json(updatedStall);
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes("unique")) {
            return res.status(400).json({ error: "This email or stall name is already in use by another stall!" });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/stalls/:id', async (req, res) => {
    try {
        const stall = await getStallById(req.params.id);
        if (stall) {
            // 1. Delete stall cover image from Cloudinary
            if (stall.image) {
                const publicId = extractPublicId(stall.image);
                if (publicId) {
                    console.log(`[Cloudinary] Deleting stall cover image: ${publicId}`);
                    await cloudinary.uploader.destroy(publicId);
                }
            }

            // 2. Delete stall PDF evaluation report from Cloudinary (raw resource)
            const reportPublicId = `ua_canteen/reports/Evaluation_Report_${stall.name.replace(/\s+/g, '_')}.pdf`;
            console.log(`[Cloudinary] Deleting stall PDF report: ${reportPublicId}`);
            await cloudinary.uploader.destroy(reportPublicId, { resource_type: 'raw' });

            // 3. Delete all related feedback photos from Cloudinary
            const feedbacks = await getFeedbacksByStallName(stall.name);
            for (const f of feedbacks) {
                if (f.attachment) {
                    const feedbackPhotoPublicId = extractPublicId(f.attachment);
                    if (feedbackPhotoPublicId) {
                        console.log(`[Cloudinary] Deleting feedback photo: ${feedbackPhotoPublicId}`);
                        await cloudinary.uploader.destroy(feedbackPhotoPublicId);
                    }
                }
            }

            // 4. Delete all related feedbacks from Neon
            await deleteFeedbacksByStallName(stall.name);
        }

        // 5. Delete the stall itself from Neon
        await deleteStall(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error("Cascade Delete Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;