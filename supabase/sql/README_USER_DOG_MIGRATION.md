# Database Migration: Track User's Dog in Contacts

## Problem

The chat system was not tracking which of the user's dogs was used to initiate a contact. This caused issues when users have multiple dogs - the system would always show the first dog instead of the one actually used for matching.

## Solution

This migration adds a `user_dog_id` column to the `contacts` table and updates the `ensure_contact()` function to store which dog the user selected when creating a contact.

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `update_contacts_for_user_dog.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd capstone/dabreeder

# Run the migration
supabase db push

# Or execute the specific file
supabase db execute -f supabase/sql/update_contacts_for_user_dog.sql
```

## What This Migration Does

1. **Adds `user_dog_id` column** to the `contacts` table
   - Stores which dog the current user used to initiate the contact
   - References the `dogs` table
   - Includes an index for better query performance

2. **Updates `ensure_contact()` function**
   - Now accepts an optional `in_user_dog_id` parameter
   - Stores the user's dog ID when creating new contacts
   - Updates the user_dog_id for existing contacts if provided

## Testing After Migration

1. **Create a new contact**:
   - Go to Find Matches
   - Select a dog from your list
   - Contact another dog
   - Open the chat

2. **Verify the correct dogs are shown**:
   - The contacted dog should appear first (left avatar)
   - Your selected dog should appear second (right avatar)
   - Names should match: "ContactedDog & YourDog"

3. **Check with multiple dogs**:
   - If you have multiple dogs, create contacts with different ones
   - Each chat should show the specific dog you used, not always the first one

## Rollback (if needed)

If you need to undo this migration:

```sql
-- Remove the column
ALTER TABLE contacts DROP COLUMN IF EXISTS user_dog_id;

-- Restore the original function (without user_dog_id parameter)
CREATE OR REPLACE FUNCTION ensure_contact(
  in_dog_id UUID,
  in_dog_name TEXT,
  in_dog_image TEXT,
  in_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- [Original function body without user_dog_id handling]
$$;
```

## Notes

- Existing contacts will have `user_dog_id = NULL` until they are updated
- The system will fall back to the first dog if `user_dog_id` is not set
- This is backward compatible - old code will still work
