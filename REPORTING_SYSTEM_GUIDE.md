# DaBreeder Reporting System Guide

## Overview

Complete SQL schema for handling user reports across three main areas:

- 🐕 **Dog Profile Reports** - Fake profiles, inappropriate content, etc.
- 💬 **Chat Message Reports** - Harassment, spam, explicit content
- 📋 **Forum Thread Reports** - Misinformation, hate speech, etc.

---

## Database Schema

### Main Tables

#### 1. **reports** (Core reporting table)

The main table where all reports are stored.

```sql
-- Key Fields:
- id: UUID (Primary Key)
- reporter_id: UUID (Who submitted the report)
- report_type: TEXT ('dog_profile', 'chat_message', 'forum_thread')
- target_id: UUID (ID of what's being reported)
- reason: TEXT (Main reason)
- category: TEXT (Specific category - see below)
- description: TEXT (Detailed explanation)
- evidence_urls: TEXT[] (Array of image/file URLs)
- status: TEXT ('open', 'under_review', 'resolved', 'rejected', 'appealed')
- priority: TEXT ('low', 'normal', 'high', 'critical')
- reviewed_by: UUID (Admin who reviewed it)
- resolution: TEXT (What action was taken)
- admin_notes: TEXT (Internal notes)
- appeal_reason: TEXT (For appeals)
```

#### 2. **dog_profile_reports**

Specific data for dog profile reports.

```sql
- id: UUID (Primary Key)
- report_id: UUID (Reference to reports table)
- dog_id: UUID (Dog being reported)
- dog_owner_id: UUID (Owner of the dog)
- dog_name: TEXT (Snapshot of dog name)
- dog_breed: TEXT (Snapshot of breed)
- action_taken: TEXT (Action taken on the dog)
```

#### 3. **chat_message_reports**

Specific data for chat message reports.

```sql
- id: UUID (Primary Key)
- report_id: UUID (Reference to reports table)
- message_id: UUID (Message being reported)
- sender_id: UUID (Who sent the message)
- receiver_id: UUID (Who received it)
- message_content: TEXT (Snapshot of content)
- action_taken: TEXT (Action taken)
```

#### 4. **forum_thread_reports**

Specific data for forum thread reports.

```sql
- id: UUID (Primary Key)
- report_id: UUID (Reference to reports table)
- thread_id: UUID (Thread being reported)
- thread_author_id: UUID (Author of thread)
- thread_title: TEXT (Snapshot of title)
- thread_content: TEXT (Snapshot of content)
- action_taken: TEXT (Action taken)
```

#### 5. **report_comments**

For admins to discuss and comment on reports.

```sql
- id: UUID (Primary Key)
- report_id: UUID (Which report)
- admin_id: UUID (Admin commenting)
- comment_text: TEXT (The comment)
```

---

## Report Categories

### Dog Profile Categories

- `fake_profile` - Fake/fake breed profile
- `inappropriate_content` - Adult content, etc.
- `offensive_language` - Offensive bio/description
- `scam_fraud` - Scam or fraudulent activity
- `copyright_infringement` - Using copyrighted material
- `privacy_violation` - Sharing private info
- `animal_abuse` - Signs of abuse
- `inappropriate_images` - Inappropriate dog photos

### Chat/Forum Categories

- `harassment` - Targeted harassment
- `spam` - Spam messages/links
- `explicit_content` - Explicit material
- `hate_speech` - Hate or discrimination
- `misinformation` - False information
- `other` - Other/unspecified

---

## Report Status Flow

```
open
  ↓
under_review (Admin reviewing)
  ↓
├─ resolved (Action taken)
├─ rejected (Not a violation)
└─ appealed (User appeals decision)
    ↓
    resolved or rejected
```

---

## Priority Levels

- **critical** - Illegal content, severe abuse
- **high** - Harassment, explicit content
- **normal** - Typical violations
- **low** - Minor issues

---

## Actions That Can Be Taken

### For Dog Profiles

- `none` - No action
- `warning_sent` - Warning to dog owner
- `profile_hidden` - Hide the profile
- `profile_deleted` - Delete the profile
- `user_banned` - Ban the user

### For Chat Messages

- `none` - No action
- `warning_sent` - Warning to sender
- `message_deleted` - Delete the message
- `conversation_muted` - Mute conversation
- `user_blocked` - Block users
- `user_banned` - Ban the user

### For Forum Threads

- `none` - No action
- `warning_sent` - Warning to author
- `thread_hidden` - Hide the thread
- `thread_deleted` - Delete the thread
- `user_banned` - Ban the user

---

## SQL Setup Instructions

### 1. Run the Schema

Copy and paste the entire `reporting_system.sql` file into your Supabase SQL Editor and execute it.

### 2. Enable RLS

The SQL includes Row Level Security (RLS) policies:

- Users can view their own reports
- Admins can view/manage all reports
- Users can create new reports

### 3. Verify Tables Created

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%report%';
```

---

## Example Usage

### Report a Dog Profile

```javascript
const { data, error } = await supabase.from("reports").insert({
  reporter_id: currentUserId,
  report_type: "dog_profile",
  target_id: dogId,
  reason: "Appears to be a fake profile",
  category: "fake_profile",
  description: "This dog breed and photos do not match the description provided",
  evidence_urls: ["https://...image1.jpg", "https://...image2.jpg"],
  priority: "normal",
});

// Then insert dog-specific data
await supabase.from("dog_profile_reports").insert({
  report_id: data[0].id,
  dog_id: dogId,
  dog_owner_id: ownerId,
  dog_name: dogData.name,
  dog_breed: dogData.breed,
});
```

### Report a Chat Message

```javascript
const { data, error } = await supabase.from("reports").insert({
  reporter_id: currentUserId,
  report_type: "chat_message",
  target_id: messageId,
  reason: "Harassment",
  category: "harassment",
  description: "User sent offensive messages",
  priority: "high",
});

// Then insert chat-specific data
await supabase.from("chat_message_reports").insert({
  report_id: data[0].id,
  message_id: messageId,
  sender_id: senderId,
  receiver_id: receiverId,
  message_content: messageContent,
});
```

### Report a Forum Thread

```javascript
const { data, error } = await supabase.from("reports").insert({
  reporter_id: currentUserId,
  report_type: "forum_thread",
  target_id: threadId,
  reason: "Misinformation",
  category: "misinformation",
  description: "Thread contains false health information",
  priority: "high",
});

// Then insert forum-specific data
await supabase.from("forum_thread_reports").insert({
  report_id: data[0].id,
  thread_id: threadId,
  thread_author_id: authorId,
  thread_title: threadTitle,
  thread_content: threadContent,
});
```

---

## Admin Dashboard Queries

### Get All Open Reports

```sql
SELECT * FROM reports
WHERE status = 'open'
ORDER BY priority DESC, created_at DESC;
```

### Get Reports by Type

```sql
SELECT * FROM reports
WHERE report_type = 'dog_profile'
AND status = 'open'
ORDER BY created_at DESC;
```

### Get Critical Reports

```sql
SELECT * FROM reports
WHERE priority = 'critical'
AND status = 'open'
ORDER BY created_at ASC;
```

### Get High Priority Open Reports

```sql
SELECT * FROM reports
WHERE status = 'open'
AND priority IN ('critical', 'high')
ORDER BY created_at ASC;
```

### Get Reports for a Specific Dog

```sql
SELECT r.*, d.dog_name, d.dog_owner_id
FROM reports r
JOIN dog_profile_reports d ON r.id = d.report_id
WHERE d.dog_id = 'dog-uuid'
ORDER BY r.created_at DESC;
```

### Count Reports by Category

```sql
SELECT category, COUNT(*) as count
FROM reports
GROUP BY category
ORDER BY count DESC;
```

### Get Resolved Reports

```sql
SELECT * FROM reports
WHERE status = 'resolved'
ORDER BY updated_at DESC
LIMIT 100;
```

### Get Reports with Admin Notes

```sql
SELECT * FROM reports
WHERE admin_notes IS NOT NULL
ORDER BY updated_at DESC;
```

---

## Frontend Components Needed

### 1. **Report Modal Component** (ReportModal.jsx)

- Show in dog profile, chat, forum pages
- Collect reason, category, description
- Allow file/image uploads for evidence

### 2. **Admin Reports Dashboard** (AdminReportsPage.jsx)

- List all reports
- Filter by status, type, priority
- View report details
- Add notes and take action
- Handle appeals

### 3. **Report Details Modal** (ReportDetailsModal.jsx)

- Show full report information
- Show evidence files/images
- Admin can review and take action
- Add comments

---

## Security Notes

✅ **Row Level Security (RLS) Enabled:**

- Users can only see their own reports (unless admin)
- Admins have full access
- Automatic user authentication check

✅ **Data Integrity:**

- Foreign keys ensure referential integrity
- Cascading deletes prevent orphaned records
- Check constraints on categories and statuses

✅ **Audit Trail:**

- Timestamps on all actions
- Admin who reviewed stored
- Action history preserved
- Appeal tracking

---

## Future Enhancements

- [ ] Automated moderation (keyword detection)
- [ ] Machine learning for abuse detection
- [ ] Report escalation to external authorities
- [ ] Appeal system UI
- [ ] Batch actions on reports
- [ ] Report analytics/trends
- [ ] Email notifications to admins
- [ ] Report templates
- [ ] Report scheduling/automation
- [ ] Integration with third-party moderation services

---

## Troubleshooting

**Issue:** Cannot create reports

- Check that `reporter_id` is set to authenticated user
- Verify user exists in `users` table

**Issue:** Admins can't see reports

- Check user role is set to 'admin' in users table
- Verify RLS policies are enabled

**Issue:** Evidence files not saving

- Ensure `evidence_urls` is array type: `TEXT[]`
- Check files are uploaded to storage first

**Issue:** Cascade delete not working

- Verify foreign key constraints are in place
- Check `ON DELETE CASCADE` is set correctly
