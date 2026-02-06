-- Late Qualifying Answers: Captures answers provided later in conversation
-- after qualifying questions were skipped or paused

-- 1. Add late_qualifying_answers column to qualified_leads table
ALTER TABLE qualified_leads
  ADD COLUMN IF NOT EXISTS late_qualifying_answers JSONB DEFAULT '[]'::jsonb;

-- 2. Create function to append a late answer to the array
CREATE OR REPLACE FUNCTION append_late_answer(
  lead_id UUID,
  late_answer JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE qualified_leads
  SET
    late_qualifying_answers = late_qualifying_answers || late_answer,
    updated_at = NOW()
  WHERE id = lead_id;
END;
$$;

-- 3. Create function to mark a late answer as promoted
CREATE OR REPLACE FUNCTION mark_late_answer_promoted(
  lead_id UUID,
  answer_index INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE qualified_leads
  SET
    late_qualifying_answers = jsonb_set(
      late_qualifying_answers,
      ARRAY[answer_index::text, 'promoted'],
      'true'::jsonb
    ),
    updated_at = NOW()
  WHERE id = lead_id;
END;
$$;

-- Comment for documentation
COMMENT ON COLUMN qualified_leads.late_qualifying_answers IS
  'Array of answers captured later in conversation for skipped qualifying questions. Structure: [{question_index, question_text, answer, raw_message, confidence, capture_type, captured_at, promoted}]';
