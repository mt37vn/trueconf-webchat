const nodemailer = require('nodemailer');
require('dotenv').config();

const {
    MAIL_HOST,
    MAIL_PORT,
    MAIL_USER,
    MAIL_PASS,
    MAIL_FROM,
    MAIL_TO
} = process.env;

// Check if mailer is configured
const isConfigured = MAIL_HOST && MAIL_USER && MAIL_PASS && MAIL_TO;

let transporter = null;

if (isConfigured) {
    transporter = nodemailer.createTransport({
        host: MAIL_HOST,
        port: parseInt(MAIL_PORT || '587'),
        secure: MAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASS
        }
    });

    // Verify connection on startup
    transporter.verify((error, success) => {
        if (error) {
            console.error('[MAILER] Connection error:', error.message);
        } else {
            console.log('[MAILER] Server is ready to take our messages');
        }
    });
} else {
    console.warn('[MAILER] SMTP credentials not fully configured. Mail sending will be disabled.');
}

/**
 * Send contact form email
 * @param {Object} data - { name, email, phone, subject, message }
 */
async function sendContactEmail(data) {
    if (!transporter) {
        console.warn('[MAILER] Cannot send email: transporter not configured.');
        return { success: false, error: 'Mailer not configured' };
    }

    const { name, email, phone, subject, message } = data;

    const mailOptions = {
        from: MAIL_FROM || MAIL_USER,
        to: MAIL_TO,
        subject: `[Contact Form] ${subject || 'New Inquiry'}`,
        text: `
Name: ${name}
Email: ${email}
Phone: ${phone || 'N/A'}

Message:
${message}
        `,
        html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
            <br>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[MAILER] Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[MAILER] Send error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendContactEmail,
    isConfigured: () => !!transporter
};
