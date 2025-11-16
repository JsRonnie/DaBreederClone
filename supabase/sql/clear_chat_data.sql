-- Clear all chat data safely
-- Run this in your Supabase SQL Editor

-- Step 1: Delete all messages first (child table)
DELETE FROM messages;

-- Step 2: Delete all contacts (parent table)
DELETE FROM contacts;

-- Optional: Reset sequences if you want IDs to start from 1 again
-- (Only needed if your tables use SERIAL/BIGSERIAL for primary keys)
-- ALTER SEQUENCE messages_id_seq RESTART WITH 1;
-- ALTER SEQUENCE contacts_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as messages_count FROM messages;
SELECT COUNT(*) as contacts_count FROM contacts;
