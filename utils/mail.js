// utils/mail.js

import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

// ✅ Resend config
const resendApiKey = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM; // ZentroEat <onboarding@resend.dev>

if (!resendApiKey) {
  console.warn("⚠️ RESEND_API_KEY is not set. Emails will fail.");
}
if (!FROM_EMAIL) {
  console.warn("⚠️ EMAIL_FROM is not set. Emails will fail.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Generic helper
async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.error("❌ Resend client not configured (missing RESEND_API_KEY)");
    throw new Error("Email service not configured");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      // 👇 VERY IMPORTANT: log full error so we can debug
      console.error("❌ Resend email error:", JSON.stringify(error, null, 2));
      throw new Error(`Resend error: ${error.message || "Failed to send email"}`);
    }

    console.log("✅ Email sent via Resend:", data);
  } catch (err) {
    console.error("❌ sendEmail error:", err);
    throw err;
  }
}

// ==== exported functions (same as before) ====

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
  if (!adminEmail) {
    console.warn("⚠️ ADMIN_EMAIL not set, skipping admin notification email.");
    return;
  }

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
