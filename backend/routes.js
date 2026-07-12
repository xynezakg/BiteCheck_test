const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

const {
    pool, addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    getFeedbackPhoto,
    getAllStalls, addStall, deleteStall, editStall,
    getStallByToken, verifyStallEmail, getStallById,
    getFeedbacksByStallName, deleteFeedbacksByStallName
} = require('./db');
const { verifySignature } = require('./eddsa');
const { registerUser, loginUser, requireAuth } = require('./auth');
const { generateStoreReport, analyzeFeedbackData } = require('./reportGenerator');
const { sendEmail } = require('./email');

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

// --- IDENTITY & AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);

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

// --- SECURE FEEDBACK ROUTE ---
router.post('/feedback', requireAuth, async (req, res) => {
    let { rating, comment, attachment, signature, public_key } = req.body;

    const customer_name = req.user.full_name;
    const user_id = req.user.id;

    rating = Number(rating);
    comment = comment ? String(comment).trim() : "";

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
        const inserted = await addFeedback({ user_id, customer_name, rating, comment, signature, public_key, attachment });
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
            const feedbackForVerify = {
                customer_name: row.customer_name,
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

            return { ...row, _is_signature_valid: valid, has_attachment };
        });

        res.json(verifiedRows);
    } catch (e) {
        res.status(500).json({ error: "Couldn't fetch feedback." });
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

router.delete('/feedback/:id', async (req, res) => {
    try {
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
        const feedbackForVerify = {
            customer_name: row.customer_name,
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