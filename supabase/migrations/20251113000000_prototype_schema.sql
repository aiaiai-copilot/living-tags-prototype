-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- Reference: auth.users (built-in)

-- Tags table: user-specific tag glossary
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name) -- Unique per user
);

COMMENT ON TABLE tags IS 'User-specific tag glossaries (user''s personal tag vocabulary)';
COMMENT ON COLUMN tags.user_id IS 'Owner of this tag';
COMMENT ON COLUMN tags.name IS 'Tag name in user''s language (typically Russian)';

-- Texts table: user's text collection
CREATE TABLE texts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE texts IS 'User text collections';
COMMENT ON COLUMN texts.user_id IS 'Owner of this text';

-- Text-Tags junction: many-to-many with confidence and source tracking
CREATE TABLE text_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(10) NOT NULL CHECK (source IN ('ai', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(text_id, tag_id)
);

COMMENT ON TABLE text_tags IS 'Text-tag relationships with AI confidence scores and source tracking';
COMMENT ON COLUMN text_tags.confidence IS 'Confidence score (0.00-1.00). Always 1.00 for manual tags';
COMMENT ON COLUMN text_tags.source IS 'Tag source: "ai" (Claude API) or "manual" (user-added)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User data queries
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_texts_user_id ON texts(user_id);

-- Junction table foreign keys
CREATE INDEX idx_text_tags_text_id ON text_tags(text_id);
CREATE INDEX idx_text_tags_tag_id ON text_tags(tag_id);

-- Search and filtering
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_text_tags_confidence ON text_tags(confidence DESC);
CREATE INDEX idx_text_tags_source ON text_tags(source);

-- Timestamp queries
CREATE INDEX idx_texts_created_at ON texts(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies: users can only access their own tags
CREATE POLICY "Users can view their own tags" ON tags
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
    FOR DELETE
    USING (auth.uid() = user_id);

-- Texts policies: users can only access their own texts
CREATE POLICY "Users can view their own texts" ON texts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own texts" ON texts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own texts" ON texts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own texts" ON texts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Text-tags policies: users can only access relationships for their own data
CREATE POLICY "Users can view text_tags for their texts" ON text_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert text_tags for their texts" ON text_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update text_tags for their texts" ON text_tags
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete text_tags for their texts" ON text_tags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_texts_updated_at
    BEFORE UPDATE ON texts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_tags_updated_at
    BEFORE UPDATE ON text_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
