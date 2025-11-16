-- Add columns to store the user's dog information in contacts table
-- This allows tracking which of the user's dogs is involved in each conversation

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS my_dog_id UUID REFERENCES public.dogs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS my_dog_name TEXT,
ADD COLUMN IF NOT EXISTS my_dog_image TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_my_dog_id ON public.contacts(my_dog_id);

-- Add comment to explain the purpose
COMMENT ON COLUMN public.contacts.my_dog_id IS 'The ID of the user''s dog involved in this conversation';
COMMENT ON COLUMN public.contacts.my_dog_name IS 'Cached name of the user''s dog for quick display';
COMMENT ON COLUMN public.contacts.my_dog_image IS 'Cached image URL of the user''s dog for quick display';
