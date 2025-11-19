import dotenv from "dotenv";
dotenv.config();

// ✅ 1) RESEND SETUP (for Render / production)
import { Resend } from "resend";
const resendApiKey = process.env.RESEND_API_KEY || null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL; // fallback

// ✅ 2) NODEMAILER SETUP (fallback for local dev, when RESEND_API_KEY not set)
import nodemailer from "nodemailer";

const gmailTransporter =
  !resendApiKey && process.env.EMAIL && process.env.PASS
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASS,
        },
      })
    : null;

// Helper: send via Resend
async function sendWithResend({ to, subject, html }) {
  if (!resend) {
    throw new Error("Resend is not configured");
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL, // e.g. 'FoodHub <noreply@yourdomain.com>'
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("❌ Resend email error:", error);
    throw new Error("Failed to send email");
  }

  console.log("✅ Resend email sent:", data);
}

// Helper: send via Gmail Nodemailer
async function sendWithGmail({ to, subject, html }) {
  if (!gmailTransporter) {
    throw new Error("Gmail transporter not configured");
  }

  const info = await gmailTransporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject,
    html,
  });

  console.log("✅ Gmail email sent:", info.messageId);
}

// Unified helper: choose provider based on env
async function sendEmail(options) {
  if (resend) {
    return sendWithResend(options);
  }
  return sendWithGmail(options);
}

// 🚀 Exported functions (signatures unchanged)

export const sendOtpMail = async (to, otp) => {
  await sendEmail({
    to,
    subject: "Reset Your Password",
    html: `
      <p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>
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
      <p>Your owner verification request has been <b>approved</b>. You can now create your shop in the app.</p>
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
      ${reason ? `<p>Reason: ${reason}</p>` : ""}
      <p>You can contact support for more details.</p>
    `,
  });
};
