// test-email.js
const sgMail = require('@sendgrid/mail');

// Set your API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Define the email message
const msg = {
    to: 'akintadetopcy@gmail.com', // 👈 Your personal email address
    from: 'info@phemmysolar.com',      // 👈 Must match your verified sender/domain
    subject: 'Test Email from Phemmy Solar',
    text: 'Hello! This is a test email sent via SendGrid from Railway.',
    html: '<strong>Hello! This is a test email sent via SendGrid from Railway.</strong>',
};

// Send the email
sgMail
    .send(msg)
    .then(() => {
        console.log('✅ Email sent successfully!');
    })
    .catch((error) => {
        console.error('❌ Error sending email:', error);
    });