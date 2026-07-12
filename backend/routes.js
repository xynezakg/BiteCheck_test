const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

const {
    addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    getFeedbackPhoto,
    getAllStalls, addStall, deleteStall, editStall,
    getStallByToken, verifyStallEmail, getStallById
} = require('./db');
const { verifySignature } = require('./eddsa');
const { registerUser, loginUser, requireAuth } = require('./auth');
const { generateStoreReport, analyzeFeedbackData } = require('./reportGenerator');

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

// --- HELPER: SEND EMAIL VIA NODEMAILER (GMAIL SMTP) ---
const sendEmail = async (toEmail, subject, htmlContent, pdfBuffer = null, pdfName = "") => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.SMTP_FROM || `"UA Canteen Administration" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent
        };

        if (pdfBuffer) {
            mailOptions.attachments = [
                {
                    filename: pdfName || 'Evaluation_Report.pdf',
                    content: pdfBuffer
                }
            ];
        }

        const info = await transporter.sendMail(mailOptions);
        return { data: info };
    } catch (error) {
        console.error("\n[Nodemailer Error]:", error);
        return { error: error.message || "Failed to send via Nodemailer" };
    }
};

// --- IDENTITY & AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);

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
        let { name, image, email } = req.body;
        if (!name) return res.status(400).json({ error: "Stall name is required" });

        if (image && !image.startsWith('http')) {
            const uploadRes = await cloudinary.uploader.upload(image, { folder: 'ua_canteen/stalls' });
            image = uploadRes.secure_url;
        }

        let verificationToken = null;
        if (email) {
            verificationToken = crypto.randomBytes(20).toString('hex');
        }

        const newStall = await addStall(name, image || null, email || null, verificationToken);

        if (email) {
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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
        let { name, image, email } = req.body;
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

        const updatedStall = await editStall(req.params.id, name, image || null, email || null, isVerified, verificationToken);

        if (emailChanged && email) {
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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
        if (stall && stall.image) {
            const publicId = extractPublicId(stall.image);
            if (publicId) {
                console.log(`[Cloudinary] Deleting stall image with public ID: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await deleteStall(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;