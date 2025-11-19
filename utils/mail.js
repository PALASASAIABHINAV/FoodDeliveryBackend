// utils/mail.js

import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// 🔵 Brevo configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.EMAIL;
const SENDER_NAME = process.env.SENDER_NAME || "ZentroEat";

// Startup checks
if (!BREVO_API_KEY) {
  console.warn("⚠️ BREVO_API_KEY is not set. Emails will fail.");
}
if (!SENDER_EMAIL) {
  console.warn("⚠️ SENDER_EMAIL is not set. Emails will fail.");
}

async function sendEmail({ to, subject, html }) {
  console.log("📧 [Brevo] sendEmail called:", { to, subject });

  if (!BREVO_API_KEY) {
    console.error("❌ [Brevo] Missing BREVO_API_KEY");
    throw new Error("Email service not configured (no Brevo API key)");
  }

  if (!SENDER_EMAIL) {
    console.error("❌ [Brevo] Missing SENDER_EMAIL");
    throw new Error("Email service not configured (no sender email)");
  }

  // Normalize "to" into array of { email }
  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: SENDER_EMAIL,
          name: SENDER_NAME,
        },
        to: recipients,
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15s timeout
      }
    );

    console.log("✅ [Brevo] Email sent successfully:", response.data);
  } catch (err) {
    // Detailed logging for debugging
    if (err.response) {
      console.error("❌ [Brevo] API error:", {
        status: err.response.status,
        data: err.response.data,
      });
      throw new Error(
        `Brevo API error: ${err.response.status} - ${
          err.response.data?.message || JSON.stringify(err.response.data)
        }`
      );
    } else if (err.request) {
      console.error("❌ [Brevo] No response from API:", err.message);
      throw new Error("Brevo request error: no response from server");
    } else {
      console.error("❌ [Brevo] Unexpected error:", err);
      throw err;
    }
  }
}

// ================= Exported helpers =================

export const sendOtpMail = async (to, otp) => {
  console.log("🔐 [Mail] sendOtpMail ->", to);
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
    console.warn("⚠️ [Mail] ADMIN_EMAIL not set, skipping owner request email.");
    return;
  }

  console.log("📮 [Mail] sendOwnerRequestMailToAdmin ->", adminEmail);

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
  console.log("✅ [Mail] sendOwnerApprovalMail ->", to);
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
  console.log("❌ [Mail] sendOwnerRejectionMail ->", to);
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
