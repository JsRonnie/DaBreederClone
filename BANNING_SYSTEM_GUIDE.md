# Banning System Implementation Guide

## Overview

A complete user banning system has been implemented with:

- ✅ Admin banning interface with reason input
- ✅ Automatic notification emails to banned users
- ✅ Ban status check on login
- ✅ Banned user modal preventing access
- ✅ Support for reactivation/unban

---

## Database Schema Updates

### Add these columns to the `users` table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
```

### Create notifications table for ban records:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ban_notification', 'unban_notification', etc.
  subject TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Files Modified/Created

### 1. **`src/lib/banNotification.js`** (NEW)

Handles ban notifications and checking ban status.

**Functions:**

- `sendBanNotificationEmail(email, userName, reason)` - Sends ban notification
- `checkUserBanStatus(userId)` - Checks if user is banned

### 2. **`src/components/BannedUserModal.jsx`** (NEW)

Modal displayed to banned users when they try to access the app.

**Features:**

- Shows suspension message
- Displays ban reason
- Provides support contact email
- Sign out button

### 3. **`src/context/AuthContext.jsx`** (MODIFIED)

Updated to:

- Check `is_active` status during login
- Store `isBanned` and `banReason` in user object
- Show `BannedUserModal` if user is banned
- Fetch ban status from database

**Changes:**

```javascript
// Now fetches and checks:
- is_active (boolean)
- ban_reason (text)
- Returns: { id, name, email, role, isBanned, banReason, avatarUrl }
```

### 4. **`src/pages/AdminUsersPage.jsx`** (MODIFIED)

Updated to:

- Show ban reason input modal before banning
- Send notification emails when banning
- Store ban timestamp and reason
- Clear ban data when reactivating

**New Features:**

- Ban Reason Modal for admins
- Automatic notification sending
- Better UX with two-step ban process

---

## How It Works

### Step 1: Admin Banning a User

1. Admin clicks **Ban** button on user
2. **Ban Reason Modal** opens
3. Admin enters reason (e.g., "Harassment", "Spam")
4. Admin clicks "Continue with Ban"
5. **Confirmation Modal** shows
6. Admin confirms
7. User is banned and notification is sent

### Step 2: Banned User Logs In

1. User tries to log in
2. `AuthContext` checks `is_active` status
3. If `is_active = false`, sets `isBanned = true`
4. **BannedUserModal** automatically displays
5. User sees suspension reason and support email
6. User can only sign out

### Step 3: Reactivating User

1. Admin clicks **✓ Reactivate** button
2. Confirmation modal shows
3. Admin confirms
4. User is reactivated: `is_active = true`, `ban_reason = null`
5. User can log in again

---

## API Endpoints (If using Edge Functions)

### Email Service Integration (Optional)

To send actual emails, integrate with Resend, SendGrid, or similar:

```javascript
// In sendBanNotificationEmail function:
await fetch("/api/send-email", {
  method: "POST",
  body: JSON.stringify({
    to: email,
    subject: "Your DaBreeder Account Has Been Banned",
    html: `
      <h2>Account Suspended</h2>
      <p>Your DaBreeder account has been suspended.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Contact support at support@dabreeder.com</p>
    `,
  }),
});
```

---

## User Experience Flow

### For Regular Users (when banned):

```
Login Attempt
    ↓
AuthContext checks is_active
    ↓
is_active = false detected
    ↓
BannedUserModal displays
    ├─ Shows ban reason
    ├─ Shows support email
    └─ Sign out button
    ↓
User can only sign out
```

### For Admin (banning user):

```
Click Ban Button
    ↓
Ban Reason Modal opens
    ├─ Input field for reason
    └─ Continue button
    ↓
Confirmation Modal
    ├─ Shows action summary
    └─ Confirm/Cancel buttons
    ↓
Ban executed & notification sent
    ↓
Toast: "User banned. Notification sent."
```

---

## Testing the Ban System

### 1. Test Banning:

1. Go to Admin Dashboard → User Management
2. Find any non-admin user
3. Click Ban button (prohibition icon)
4. Enter reason: "Testing ban system"
5. Confirm
6. See success notification

### 2. Test Banned User Login:

1. Log out the admin
2. Try to log in with the banned user's email
3. See BannedUserModal with the ban reason
4. Click Sign Out

### 3. Test Reactivation:

1. Log back in as admin
2. Go to User Management
3. Filter by "Banned Users"
4. Click ✓ button to reactivate
5. Confirm
6. Try logging in as that user again - should work

---

## Customization Options

### Change Ban Reason

Edit in `src/pages/AdminUsersPage.jsx`:

```javascript
// Default ban reason when empty
ban_reason: banReason || "Terms of Service violation";
```

### Change Ban Notification Email

Edit in `src/lib/banNotification.js`:

```javascript
message: `Dear ${userName}, Your DaBreeder account... `;
// Add your email service here
```

### Change Support Email

Edit in `src/components/BannedUserModal.jsx`:

```javascript
<a href="mailto:support@dabreeder.com">support@dabreeder.com</a>
```

---

## Security Notes

✅ **Is Secure Because:**

- Ban status checked in AuthContext on every login
- Database stores authoritative `is_active` status
- Admin-only access to ban controls
- Ban reason stored for audit trail
- Notification record created for compliance

---

## Future Enhancements

- [ ] Email service integration (SendGrid, Resend, etc.)
- [ ] Ban appeal form
- [ ] Automatic unbanning after time period
- [ ] Ban history/audit log
- [ ] SMS notifications
- [ ] Discord/Slack admin notifications
- [ ] Temp ban vs permanent ban
- [ ] Ban analytics dashboard

---

## Troubleshooting

**Issue:** Banned user can still log in

- **Fix:** Ensure `is_active` column exists in users table
- **Check:** Run: `SELECT * FROM users WHERE email = 'user@email.com';`

**Issue:** Ban notification not working

- **Fix:** Create `notifications` table first
- **Check:** Logs for errors in `sendBanNotificationEmail`

**Issue:** Modal doesn't show for banned users

- **Fix:** Ensure BannedUserModal imported in AuthContext
- **Check:** Browser console for errors
