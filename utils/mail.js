// utils/mail.js

import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// 🔐 Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

// (optional but useful) test connection once at startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Brevo SMTP connection error:", err);
  } else {
    console.log("✅ Brevo SMTP is ready to send emails");
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL, // must be verified in Brevo
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.messageId);
  } catch (err) {
    // ⛔ show full details in server logs
    console.error("❌ Email send error (Brevo):", err);

    // IMPORTANT: rethrow the ORIGINAL error, not a generic one
    throw err;
  }
}

// ==== exported functions stay the same ====

export const sendOtpMail = async (to, otp) => {
  await sendEmail({
    to,
    subject: "Reset Your Password",
    html: `
      <h2>ZentroEat – Password Reset</h2>
      <p>Your OTP for password reset is:</p>
      <h1 style="letter-spacing:3px;">${otp}</h1>
      <p>This OTP expires in <b>5 minutes</b>.</p>
    `,
  });
};

export const sendOwnerRequestMailToAdmin = async (owner, request) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: "New Owner Verification Request",
    html: `
      <h3>New Owner Verification Request</h3>
      <p><b>Owner:</b> ${owner.fullName} (${owner.email})</p>
      <p><b>Phone:</b> ${owner.mobile}</p>
      <p><b>Shop:</b> ${request.shopName}</p>
      <p><b>City:</b> ${request.city}, ${request.state}</p>
      <p><b>Description:</b> ${request.description || "-"} </p>
    `,
  });
};

export const sendOwnerApprovalMail = async (to, name) => {
  await sendEmail({
    to,
    subject: "Your owner account has been approved",
    html: `
      <p>Hi ${name},</p>
      <p>Your owner verification request has been <b>approved</b>.</p>
      <p>You can now create your shop in the ZentroEat app.</p>
    `,
  });
};

export const sendOwnerRejectionMail = async (to, name, reason = "") => {
  await sendEmail({
    to,
    subject: "Your owner account has been rejected",
    html: `
      <p>Hi ${name},</p>
      <p>Sorry, your owner verification request has been <b>rejected</b>.</p>
      ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
      <p>You can contact support for more details.</p>
    `,
  });
};
