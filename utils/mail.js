import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,           // 🔁 changed from 465 to 587
  secure: false,       // 🔁 false for 587 (TLS)
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS, // ⚠️ must be a Gmail APP PASSWORD, not your normal password
  },
});

export const sendOtpMail=async(to,otp)=>{
    await transporter.sendMail({
        from:process.env.EMAIL,
        to:to,
        subject:"Reset Your Password",
        html:`
        <p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>
        `
    })
}


export const sendOwnerRequestMailToAdmin = async (owner, request) => {
  const adminEmail = process.env.ADMIN_EMAIL; // set this in .env
  if (!adminEmail) return;

  await transporter.sendMail({
    from: process.env.EMAIL,
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
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "Your owner account has been approved",
    html: `<p>Hi ${name},</p>
           <p>Your owner verification request has been <b>approved</b>. You can now create your shop in the app.</p>`,
  });
};

export const sendOwnerRejectionMail = async (to, name, reason = "") => {
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "Your owner account has been rejected",
    html: `<p>Hi ${name},</p>
           <p>Sorry, your owner verification request has been <b>rejected</b>.</p>
           ${reason ? `<p>Reason: ${reason}</p>` : ""}
           <p>You can contact support for more details.</p>`,
  });
};
