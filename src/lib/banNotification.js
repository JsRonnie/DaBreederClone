import supabase from "./supabaseClient";

/**
 * Send a ban notification email to the user
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @param {string} reason - Reason for banning
 */
export const sendBanNotificationEmail = async (
  email,
  userName,
  reason = "Terms of Service violation"
) => {
  try {
    // Use Supabase Edge Functions or your email service
    // For now, we'll create a record in a notifications table

    const { error } = await supabase.from("notifications").insert({
      user_email: email,
      type: "ban_notification",
      subject: "Your DaBreeder Account Has Been Banned",
      message: `
Dear ${userName},

Your DaBreeder account has been suspended due to: ${reason}

If you believe this is a mistake, please contact our support team at support@dabreeder.com

Best regards,
DaBreeder Team
      `,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating notification record:", error);
      return false;
    }

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Example with fetch:
    // await fetch('/api/send-email', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     to: email,
    //     subject: "Your DaBreeder Account Has Been Banned",
    //     html: `<p>Dear ${userName},</p>..`
    //   })
    // });

    console.log("Ban notification sent to:", email);
    return true;
  } catch (err) {
    console.error("Error sending ban notification:", err);
    return false;
  }
};

/**
 * Check if a user is banned on login
 * @param {string} userId - User's ID
 * @returns {Object} - { isBanned: boolean, reason: string }
 */
export const checkUserBanStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("is_active, ban_reason, banned_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error checking ban status:", error);
      return { isBanned: false, reason: null };
    }

    if (!data.is_active) {
      return {
        isBanned: true,
        reason: data.ban_reason || "Your account has been suspended",
        bannedAt: data.banned_at,
      };
    }

    return { isBanned: false, reason: null };
  } catch (err) {
    console.error("Error in checkUserBanStatus:", err);
    return { isBanned: false, reason: null };
  }
};
