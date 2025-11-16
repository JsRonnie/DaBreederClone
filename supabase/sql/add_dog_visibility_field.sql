-- Add visibility field to dogs table to control Find Match display
-- This allows users to temporarily hide their dogs from matching without deleting the profile

ALTER TABLE public.dogs
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add index for better query performance when filtering visible dogs
CREATE INDEX IF NOT EXISTS idx_dogs_is_visible ON public.dogs(is_visible);

-- Add comment to explain the purpose
COMMENT ON COLUMN public.dogs.is_visible IS 'Whether the dog is visible in Find Match (true = visible, false = hidden). Allows owners to temporarily hide dogs from breeding matches without deleting the profile.';

-- Update existing dogs to be visible by default if the column was just added
UPDATE public.dogs SET is_visible = true WHERE is_visible IS NULL;
