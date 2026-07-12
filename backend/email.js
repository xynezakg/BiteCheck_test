const nodemailer = require('nodemailer');

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

module.exports = { sendEmail };
