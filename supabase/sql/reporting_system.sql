-- ============================================
-- REPORTING SYSTEM TABLES
-- ============================================
-- This file contains the SQL schema for handling reports across DaBreeder
-- Reports can be submitted for: Dog Profiles, Chat Messages, and Forum Threads

-- ============================================
-- 1. REPORTS TABLE (Main reporting table)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Reporter info
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_at TIMESTAMP DEFAULT now(),
  
  -- What is being reported
  report_type TEXT NOT NULL CHECK (report_type IN ('dog_profile', 'chat_message', 'forum_thread')),
  target_id UUID NOT NULL, -- ID of dog, message, or thread being reported
  
  -- Report details
  reason TEXT NOT NULL, -- Main reason for report
  category TEXT NOT NULL CHECK (category IN (
    -- Dog Profile categories
    'fake_profile',
    'inappropriate_content',
    'offensive_language',
    'scam_fraud',
    'copyright_infringement',
    'privacy_violation',
    'animal_abuse',
    'inappropriate_images',
    
    -- Chat/Forum categories (reused)
    'harassment',
    'spam',
    'explicit_content',
    'hate_speech',
    'misinformation',
    'other'
  )),
  description TEXT, -- Detailed explanation from reporter
  
  -- Attachments/Evidence
  evidence_urls TEXT[], -- Array of image/file URLs as evidence
  
  -- Report status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'appealed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  -- Admin resolution
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  resolution TEXT, -- What action was taken
  admin_notes TEXT, -- Internal notes from admin
  
  -- For appeals
  appeal_reason TEXT,
  appealed_at TIMESTAMP,
  appeal_reviewed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- 2. DOG PROFILE REPORTS (Specific to dogs)
-- ============================================
CREATE TABLE IF NOT EXISTS dog_profile_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Dog that was reported
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  dog_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Specific dog profile info at time of report
  dog_name TEXT,
  dog_breed TEXT,
  reported_profile_image_url TEXT,
  
  -- Action taken
  action_taken TEXT CHECK (action_taken IN ('none', 'warning_sent', 'profile_hidden', 'profile_deleted', 'user_banned')),
  action_taken_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- 3. CHAT MESSAGE REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_message_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Message that was reported
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Message content at time of report
  message_content TEXT,
  message_sent_at TIMESTAMP,
  
  -- Action taken
  action_taken TEXT CHECK (action_taken IN ('none', 'warning_sent', 'message_deleted', 'conversation_muted', 'user_blocked', 'user_banned')),
  action_taken_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- 4. FORUM THREAD REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS forum_thread_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Thread that was reported
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  thread_author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Thread content at time of report
  thread_title TEXT,
  thread_content TEXT,
  thread_created_at TIMESTAMP,
  
  -- Action taken
  action_taken TEXT CHECK (action_taken IN ('none', 'warning_sent', 'thread_hidden', 'thread_deleted', 'user_banned')),
  action_taken_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- 5. REPORT COMMENTS (For admin discussion)
-- ============================================
CREATE TABLE IF NOT EXISTS report_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Admin comment
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);

CREATE INDEX IF NOT EXISTS idx_dog_profile_reports_dog_id ON dog_profile_reports(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_profile_reports_dog_owner_id ON dog_profile_reports(dog_owner_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_reports_message_id ON chat_message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reports_sender_id ON chat_message_reports(sender_id);

CREATE INDEX IF NOT EXISTS idx_forum_thread_reports_thread_id ON forum_thread_reports(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_reports_thread_author_id ON forum_thread_reports(thread_author_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Allow users to view their own reports
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT
  USING (reporter_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Allow users to create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Allow admins to update reports
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Similar policies for related tables
CREATE POLICY "View dog profile reports" ON dog_profile_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reports r 
    WHERE r.id = report_id AND (
      r.reporter_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  ));

CREATE POLICY "View chat message reports" ON chat_message_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reports r 
    WHERE r.id = report_id AND (
      r.reporter_id = auth.uid() OR 
      sender_id = auth.uid() OR
      receiver_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  ));

CREATE POLICY "View forum thread reports" ON forum_thread_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reports r 
    WHERE r.id = report_id AND (
      r.reporter_id = auth.uid() OR 
      thread_author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  ));

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_update_timestamp
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION update_report_timestamp();

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Get all open reports
-- SELECT * FROM reports WHERE status = 'open' ORDER BY priority DESC, created_at DESC;

-- Get all dog profile reports
-- SELECT r.*, d.dog_id, d.dog_name 
-- FROM reports r
-- JOIN dog_profile_reports d ON r.id = d.report_id
-- WHERE r.report_type = 'dog_profile'
-- ORDER BY r.created_at DESC;

-- Get reports by a specific user
-- SELECT * FROM reports WHERE reporter_id = 'user-id' ORDER BY created_at DESC;

-- Get reports for a specific dog
-- SELECT r.*, d.dog_name, d.dog_owner_id
-- FROM reports r
-- JOIN dog_profile_reports d ON r.id = d.report_id
-- WHERE d.dog_id = 'dog-id';

-- Count reports by category
-- SELECT category, COUNT(*) as count FROM reports GROUP BY category;

-- Get high priority open reports
-- SELECT * FROM reports WHERE status = 'open' AND priority = 'critical' ORDER BY created_at ASC;
