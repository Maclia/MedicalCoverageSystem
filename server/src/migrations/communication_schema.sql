-- Communication System Schema for Member Engagement Hub
-- This file defines the database schema for comprehensive member communication

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Communications Table
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('message', 'email', 'sms', 'push', 'in_app', 'chat', 'announcement', 'survey', 'reminder')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
    subject TEXT,
    content TEXT NOT NULL,
    html_content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'delivered', 'read', 'failed', 'bounced', 'spam')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('medical', 'administrative', 'wellness', 'billing', 'general', 'marketing', 'support', 'educational')),
    channel VARCHAR(50) NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('system', 'admin', 'coach', 'provider', 'support', 'member')),
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(255),
    recipient_role VARCHAR(50),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    reply_to VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    template_id UUID,
    campaign_id UUID,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication Attachments Table
CREATE TABLE communication_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Message Threads Table
CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    subject TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed', 'resolved')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Participants Table
CREATE TABLE message_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'away', 'offline')),
    last_seen TIMESTAMP WITH TIME ZONE,
    has_read BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(thread_id, user_id)
);

-- Notification Preferences Table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
    category VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'monthly')),
    min_priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (min_priority IN ('low', 'normal', 'high', 'urgent')),
    quiet_hours JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication Templates Table
CREATE TABLE communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    subject TEXT,
    content TEXT NOT NULL,
    html_content TEXT,
    variables JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Variables Table
CREATE TABLE template_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('string', 'number', 'date', 'boolean', 'array', 'object')),
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    default_value JSONB,
    validation JSONB,
    UNIQUE(template_id, name)
);

-- Communication Campaigns Table
CREATE TABLE communication_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('announcement', 'marketing', 'educational', 'wellness', 'reminder', 'survey')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled')),
    template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE RESTRICT,
    segment_criteria JSONB NOT NULL DEFAULT '{"includeAll": true, "filters": [], "exclusions": []}',
    schedule JSONB NOT NULL DEFAULT '{"type": "immediate", "timezone": "UTC"}',
    channel VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    budget DECIMAL(10,2),
    target_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    read_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    conversion_count INTEGER NOT NULL DEFAULT 0,
    metrics JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions Table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('support', 'wellness', 'medical', 'administrative', 'coaching')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'closed', 'transferred')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(255),
    department VARCHAR(100),
    queue_position INTEGER,
    estimated_wait_time INTEGER,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    resolution TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('member', 'agent', 'system')),
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system', 'typing_indicator')),
    attachments UUID[] DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    summary TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('general', 'maintenance', 'feature', 'security', 'policy', 'emergency')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
    visibility VARCHAR(50) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members', 'internal', 'role_based')),
    target_roles TEXT[] DEFAULT '{}',
    target_segments TEXT[] DEFAULT '{}',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    author UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    attachments UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    read_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Surveys Table
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('satisfaction', 'feedback', 'research', 'health_assessment', 'engagement')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    questions JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{"anonymous": false, "allowPartial": true, "showProgress": true}',
    target_criteria JSONB,
    schedule JSONB,
    responses JSONB DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey Questions Table
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('single_choice', 'multiple_choice', 'rating', 'text', 'number', 'date', 'matrix', 'nps')),
    question TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    options TEXT[] DEFAULT '{}',
    validation JSONB,
    order_number INTEGER NOT NULL,
    UNIQUE(survey_id, order_number)
);

-- Survey Responses Table
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    ip_address INET,
    user_agent TEXT,
    source VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned')),
    UNIQUE(survey_id, member_id)
);

-- Survey Answers Table
CREATE TABLE survey_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    answer JSONB NOT NULL,
    time_spent INTEGER,
    UNIQUE(response_id, question_id)
);

-- Communication Settings Table
CREATE TABLE communication_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notifications JSONB NOT NULL DEFAULT '{}',
    auto_reply JSONB NOT NULL DEFAULT '{}',
    signatures JSONB DEFAULT '[]',
    templates TEXT[] DEFAULT '{}',
    default_channels JSONB DEFAULT '{}',
    working_hours JSONB NOT NULL DEFAULT '{}',
    escalation JSONB NOT NULL DEFAULT '{}',
    compliance JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery Receipts Table
CREATE TABLE delivery_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'bounced', 'spam')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    provider VARCHAR(100) NOT NULL,
    provider_id VARCHAR(255),
    error_code VARCHAR(100),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Communication Analytics Table
CREATE TABLE communication_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('overview', 'engagement', 'performance', 'trends', 'comparative')),
    period VARCHAR(50) NOT NULL,
    filters JSONB DEFAULT '{}',
    data JSONB NOT NULL DEFAULT '{}',
    visualizations JSONB DEFAULT '[]',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_communications_member_id ON communications(member_id);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_priority ON communications(priority);
CREATE INDEX idx_communications_category ON communications(category);
CREATE INDEX idx_communications_channel ON communications(channel);
CREATE INDEX idx_communications_direction ON communications(direction);
CREATE INDEX idx_communications_created_at ON communications(created_at);
CREATE INDEX idx_communications_sender_id ON communications(sender_id);
CREATE INDEX idx_communications_template_id ON communications(template_id);
CREATE INDEX idx_communications_campaign_id ON communications(campaign_id);

CREATE INDEX idx_communication_attachments_communication_id ON communication_attachments(communication_id);
CREATE INDEX idx_communication_attachments_uploaded_by ON communication_attachments(uploaded_by);

CREATE INDEX idx_message_threads_member_id ON message_threads(member_id);
CREATE INDEX idx_message_threads_status ON message_threads(status);
CREATE INDEX idx_message_threads_priority ON message_threads(priority);
CREATE INDEX idx_message_threads_last_message_at ON message_threads(last_message_at);
CREATE INDEX idx_message_threads_updated_at ON message_threads(updated_at);

CREATE INDEX idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX idx_message_participants_user_id ON message_participants(user_id);
CREATE INDEX idx_message_participants_role ON message_participants(role);

CREATE INDEX idx_notification_preferences_member_id ON notification_preferences(member_id);
CREATE INDEX idx_notification_preferences_category ON notification_preferences(category);
CREATE INDEX idx_notification_preferences_channel ON notification_preferences(channel);

CREATE INDEX idx_communication_templates_type ON communication_templates(type);
CREATE INDEX idx_communication_templates_category ON communication_templates(category);
CREATE INDEX idx_communication_templates_is_active ON communication_templates(is_active);
CREATE INDEX idx_communication_templates_language ON communication_templates(language);

CREATE INDEX idx_template_variables_template_id ON template_variables(template_id);
CREATE INDEX idx_template_variables_name ON template_variables(name);

CREATE INDEX idx_communication_campaigns_status ON communication_campaigns(status);
CREATE INDEX idx_communication_campaigns_type ON communication_campaigns(type);
CREATE INDEX idx_communication_campaigns_created_by ON communication_campaigns(created_by);

CREATE INDEX idx_chat_sessions_member_id ON chat_sessions(member_id);
CREATE INDEX idx_chat_sessions_type ON chat_sessions(type);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_priority ON chat_sessions(priority);
CREATE INDEX idx_chat_sessions_assigned_to ON chat_sessions(assigned_to);
CREATE INDEX idx_chat_sessions_department ON chat_sessions(department);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_sender_role ON chat_messages(sender_role);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read);

CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_visibility ON announcements(visibility);
CREATE INDEX idx_announcements_author ON announcements(author);
CREATE INDEX idx_announcements_published_at ON announcements(published_at);

CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_type ON surveys(type);
CREATE INDEX idx_surveys_created_by ON surveys(created_by);

CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);
CREATE INDEX idx_survey_questions_type ON survey_questions(type);
CREATE INDEX idx_survey_questions_order_number ON survey_questions(order_number);

CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_member_id ON survey_responses(member_id);
CREATE INDEX idx_survey_responses_status ON survey_responses(status);

CREATE INDEX idx_survey_answers_response_id ON survey_answers(response_id);
CREATE INDEX idx_survey_answers_question_id ON survey_answers(question_id);

CREATE INDEX idx_delivery_receipts_communication_id ON delivery_receipts(communication_id);
CREATE INDEX idx_delivery_receipts_status ON delivery_receipts(status);
CREATE INDEX idx_delivery_receipts_channel ON delivery_receipts(channel);
CREATE INDEX idx_delivery_receipts_timestamp ON delivery_receipts(timestamp);

CREATE INDEX idx_communication_analytics_type ON communication_analytics(type);
CREATE INDEX idx_communication_analytics_period ON communication_analytics(period);
CREATE INDEX idx_communication_analytics_generated_at ON communication_analytics(generated_at);

-- Composite indexes for common queries
CREATE INDEX idx_communications_member_status_created ON communications(member_id, status, created_at DESC);
CREATE INDEX idx_communications_member_category_priority ON communications(member_id, category, priority);
CREATE INDEX idx_communications_template_sent_at ON communications(template_id, sent_at);

CREATE INDEX idx_message_threads_member_status_updated ON message_threads(member_id, status, updated_at DESC);
CREATE INDEX idx_message_threads_priority_updated ON message_threads(priority, updated_at DESC);

CREATE INDEX idx_chat_sessions_member_status_created ON chat_sessions(member_id, status, created_at);
CREATE INDEX idx_chat_sessions_assigned_status ON chat_sessions(assigned_to, status);

-- Full-text search indexes (if supported)
-- CREATE INDEX idx_communications_search ON communications USING gin(to_tsvector('english', subject || ' ' || content));
-- CREATE INDEX idx_announcements_search ON announcements USING gin(to_tsvector('english', title || ' ' || content));

-- Triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all relevant tables
CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_threads_updated_at BEFORE UPDATE ON message_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_templates_updated_at BEFORE UPDATE ON communication_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_campaigns_updated_at BEFORE UPDATE ON communication_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_settings_updated_at BEFORE UPDATE ON communication_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update thread unread count
CREATE OR REPLACE FUNCTION update_thread_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE message_threads
    SET unread_count = (
        SELECT COUNT(*) - COUNT(CASE WHEN mp.has_read THEN 1 END)
        FROM message_threads mt
        JOIN message_participants mp ON mt.id = mp.thread_id
        WHERE mt.id = NEW.thread_id
        AND mp.user_id != NEW.sender_id
        AND mp.joined_at <= NEW.created_at
        AND (mp.last_seen IS NULL OR mp.last_seen < NEW.created_at OR NOT mp.has_read)
    )
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update unread count when message is sent
CREATE TRIGGER update_unread_count_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    WHEN (NEW.type = 'text' OR NEW.type = 'image' OR NEW.type = 'file')
    EXECUTE FUNCTION update_thread_unread_count();

-- Function to update announcement read count
CREATE OR REPLACE FUNCTION update_announcement_read_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE announcements
    SET read_count = read_count + 1
    WHERE id = NEW.announcement_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update read count when message is read
CREATE TRIGGER update_read_count_on_message_read
    AFTER UPDATE ON chat_messages
    FOR EACH ROW
    WHEN (OLD.is_read = false AND NEW.is_read = true)
    EXECUTE FUNCTION update_announcement_read_count();

-- Function to calculate communication metrics
CREATE OR REPLACE FUNCTION calculate_communication_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign metrics based on communications
    IF NEW.campaign_id IS NOT NULL THEN
        UPDATE communication_campaigns
        SET
            sent_count = (
                SELECT COUNT(*)
                FROM communications
                WHERE campaign_id = NEW.campaign_id
                AND status = 'sent'
            ),
            delivered_count = (
                SELECT COUNT(*)
                FROM communications
                WHERE campaign_id = NEW.campaign_id
                AND status = 'delivered'
            ),
            read_count = (
                SELECT COUNT(*)
                FROM communications
                WHERE campaign_id = NEW.campaign_id
                AND status = 'read'
            ),
            click_count = COALESCE(click_count, 0),
            conversion_count = COALESCE(conversion_count, 0),
            metrics = jsonb_build_object(
                'sendRate', CASE WHEN target_count > 0 THEN (sent_count * 100.0 / target_count) ELSE 0 END,
                'deliveryRate', CASE WHEN sent_count > 0 THEN (delivered_count * 100.0 / sent_count) ELSE 0 END,
                'openRate', CASE WHEN delivered_count > 0 THEN (read_count * 100.0 / delivered_count) ELSE 0 END,
                'clickRate', 0, -- Would be calculated from click tracking
                'conversionRate', 0, -- Would be calculated from conversion tracking
                'bounceRate', 0, -- Would be calculated from bounce tracking
                'spamRate', 0, -- Would be calculated from spam complaints
                'unsubscribeRate', 0 -- Would be calculated from unsubscribe tracking
            )
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update campaign metrics
CREATE TRIGGER update_campaign_metrics_on_communication
    AFTER INSERT OR UPDATE ON communications
    FOR EACH ROW
    EXECUTE FUNCTION calculate_communication_metrics();

-- Function to update survey metrics
CREATE OR REPLACE FUNCTION calculate_survey_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE surveys
    SET
        metrics = jsonb_build_object(
            'totalInvitations', (
                SELECT COUNT(DISTINCT sr.member_id)
                FROM survey_responses sr
                WHERE sr.survey_id = NEW.survey_id
            ),
            'totalResponses', (
                SELECT COUNT(*)
                FROM survey_responses sr
                WHERE sr.survey_id = NEW.survey_id
            ),
            'responseRate', (
                CASE WHEN (SELECT COUNT(DISTINCT sr.member_id) FROM survey_responses sr WHERE sr.survey_id = NEW.survey_id) > 0
                THEN (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = NEW.survey_id) * 100.0 /
                     (SELECT COUNT(DISTINCT sr.member_id) FROM survey_responses sr WHERE sr.survey_id = NEW.survey_id)
                ELSE 0
                END
            ),
            'completionRate', (
                CASE WHEN (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = NEW.survey_id) > 0
                THEN (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = NEW.survey_id AND sr.status = 'completed') * 100.0 /
                     (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = NEW.survey_id)
                ELSE 0
                END
            ),
            'averageTime', (
                SELECT COALESCE(AVG(duration), 0)
                FROM survey_responses sr
                WHERE sr.survey_id = NEW.survey_id
                AND sr.status = 'completed'
            ),
            'responsesByDate', (
                SELECT jsonb_object_agg(date, response_count)
                FROM (
                    SELECT
                        DATE(started_at) as date,
                        COUNT(*) as response_count
                    FROM survey_responses
                    WHERE survey_id = NEW.survey_id
                    GROUP BY DATE(started_at)
                ) as date_responses
            ),
            'questionAnalytics', (
                SELECT jsonb_object_agg(
                    question_id,
                    jsonb_build_object(
                        'responses',
                        answer_counts,
                        'average',
                        avg_answer,
                        'distribution', -- Would need additional logic to calculate distribution
                        '{}'::jsonb
                    )
                )
                FROM (
                    SELECT
                        sq.question_id,
                        jsonb_agg(ARRAY[answer]) as answer_counts,
                        COALESCE(
                            CASE
                                WHEN sq.type = 'rating' THEN (SELECT AVG(answer::numeric) FROM survey_answers WHERE answer_id = sq.id)
                                WHEN sq.type = 'number' THEN (SELECT AVG(answer::numeric) FROM survey_answers WHERE answer_id = sq.id)
                                ELSE 0
                            END,
                            0
                        ) as avg_answer
                    FROM survey_questions sq
                    LEFT JOIN survey_answers sa ON sq.id = sa.question_id
                    JOIN survey_responses sr ON sa.response_id = sr.id
                    WHERE sr.survey_id = NEW.survey_id
                    GROUP BY sq.question_id
                ) as question_data
            )
        )
    WHERE id = NEW.survey_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update survey metrics
CREATE TRIGGER update_survey_metrics_on_response
    AFTER INSERT OR UPDATE ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_survey_metrics();

-- Insert default communication settings
INSERT INTO communication_settings (
    id,
    notifications,
    auto_reply,
    signatures,
    templates,
    default_channels,
    working_hours,
    escalation,
    compliance
) VALUES (
    uuidv4(),
    '{
        "email": true,
        "sms": false,
        "push": true,
        "in_app": true,
        "categories": {
            "medical": {"enabled": true, "channels": ["email", "push"], "frequency": "immediate", "priority": "high"},
            "general": {"enabled": true, "channels": ["email"], "frequency": "daily", "priority": "normal"},
            "wellness": {"enabled": true, "channels": ["email", "push"], "frequency": "weekly", "priority": "normal"},
            "billing": {"enabled": true, "channels": ["email", "sms"], "frequency": "immediate", "priority": "high"},
            "support": {"enabled": true, "channels": ["email", "in_app", "push"], "frequency": "immediate", "priority": "high"}
        },
        "quietHours": {
            "enabled": false,
            "start": "22:00",
            "end": "08:00",
            "timezone": "UTC"
        }
    }',
    '{
        "enabled": false,
        "message": "We have received your message and will respond shortly.",
        "conditions": {
            "outsideHours": true,
            "away": false,
            "keywords": ["urgent", "emergency", "help"],
            "categories": ["support"]
        },
        "delay": 30
    }',
    '[]',
    '["welcome", "appointment_reminder", "follow_up"]',
    '{
        "urgent": "sms",
        "high": "email",
        "normal": "email",
        "low": "in_app"
    }',
    '{
        "timezone": "UTC",
        "hours": [
            {"day": 1, "start": "09:00", "end": "17:00", "enabled": true},
            {"day": 2, "start": "09:00", "end": "17:00", "enabled": true},
            {"day": 3, "start": "09:00", "end": "17:00", "enabled": true},
            {"day": 4, "start": "09:00", "end": "17:00", "enabled": true},
            {"day": 5, "start": "09:00", "end": "17:00", "enabled": true},
            {"day": 6, "start": "10:00", "end": "14:00", "enabled": false},
            {"day": 0, "start": "10:00", "end": "14:00", "enabled": false}
        ],
        "holidays": []
    }',
    '{
        "enabled": true,
        "rules": []
    }',
    '{
        "recordRetention": 2555,
        "consentRequired": true,
        "gdprCompliant": true,
        "hipaaCompliant": true,
        "auditLogging": true,
        "encryption": {
            "at_rest": true,
            "in_transit": true
        },
        "dataMasking": true,
        "auditTrail": true
    }'
);

-- Insert sample communication templates
INSERT INTO communication_templates (
    id,
    name,
    description,
    category,
    type,
    subject,
    content,
    html_content,
    variables,
    tags,
    is_active,
    version,
    language,
    created_by,
    created_at,
    updated_at
) VALUES
    (uuidv4(), 'Welcome Email', 'Welcome email for new members', 'onboarding', 'email',
    'Welcome to Our Health Platform',
    'Dear {{memberName}},\n\nWelcome to our health platform! We''re excited to have you on board.\n\nBest regards,\n{{senderName}}',
    '<p>Dear {{memberName}},</p><p>Welcome to our health platform!</p>',
    '[{"name": "memberName", "type": "string", "description": "Member name", "required": true}, {"name": "senderName", "type": "string", "description": "Sender name", "required": true}]',
    '["welcome", "onboarding"]',
    true,
    '1.0',
    'en',
    'system',
    NOW(),
    NOW()
),
    (uuidv4(), 'Appointment Reminder', 'Appointment reminder SMS', 'appointment', 'sms',
    null,
    'Reminder: You have an appointment on {{appointmentDate}} at {{appointmentTime}} with {{providerName}}.',
    null,
    '[{"name": "appointmentDate", "type": "date", "description": "Appointment date", "required": true}, {"name": "appointmentTime", "type": "string", "description": "Appointment time", "required": true}, {"name": "providerName", "type": "string", "description": "Provider name", "required": true}]',
    '["appointment", "reminder"]',
    true,
    '1.0',
    'en',
    'system',
    NOW(),
    NOW()
),
    (uuidv4(), 'Medical Visit Follow-up', 'Follow-up after medical visit', 'medical', 'email',
    'Medical Visit Follow-up',
    'Dear {{memberName}},\n\nThis is a follow-up regarding your recent medical visit on {{visitDate}}.\n\nIf you have any questions or concerns, please don''t hesitate to reach out.\n\nBest regards,\n{{providerName}}',
    '<p>Dear {{memberName}},</p><p>This is a follow-up regarding your recent medical visit.</p>',
    '[{"name": "memberName", "type": "string", "description": "Member name", "required": true}, {"name": "visitDate", "type": "date", "description": "Visit date", "required": true}, {"name": "providerName", "type": "string", "description": "Provider name", "required": true}]',
    '["medical", "followup"]',
    true,
    '1.0',
    'en',
    'system',
    NOW(),
    NOW()
);

-- Insert sample announcement
INSERT INTO announcements (
    id, title, content, html_content, type, priority, status, visibility,
    author, author_name, tags, read_count, view_count, created_at, updated_at, published_at
) VALUES (
    uuidv4(),
    'Welcome to the Member Portal',
    'We are excited to announce the launch of our new member portal. This comprehensive platform provides you with easy access to your health information, appointment scheduling, wellness resources, and personalized health insights.',
    '<p>We are excited to announce the launch of our new member portal!</p>',
    'feature',
    'high',
    'published',
    'public',
    'system',
    'System Administrator',
    ['welcome', 'portal', 'launch'],
    0,
    0,
    NOW(),
    NOW(),
    NOW()
);

-- Insert sample survey
INSERT INTO surveys (
    id, title, description, type, status, questions, settings, responses, metrics, created_by, created_at, updated_at
) VALUES (
    uuidv4(),
    'Member Satisfaction Survey',
    'Help us improve our services by sharing your feedback',
    'satisfaction',
    'active',
    JSON_BUILD_ARRAY(
        jsonb_build_object(
            'id', uuidv4(),
            'type', 'rating',
            'question', 'How satisfied are you with our services?',
            'description', 'Please rate your overall satisfaction with our healthcare services',
            'required', true,
            'order', 1,
            'options', JSON_BUILD_ARRAY('Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied')
        ),
        jsonb_build_object(
            'id', uuidv4(),
            'type', 'text',
            'question', 'What can we do to improve your experience?',
            'description', 'Share your suggestions for improvement',
            'required', false,
            'order', 2
        )
    ),
    JSON_BUILD_OBJECT(
        'anonymous', false,
        'allowPartial', true,
        'showProgress', true,
        'notifications', JSON_BUILD_OBJECT('email', true, 'sms', false, 'push', true)
    ),
    '[]',
    JSON_BUILD_OBJECT(
        'totalInvitations', 0,
        'totalResponses', 0,
        'responseRate', 0,
        'completionRate', 0,
        'averageTime', 0,
        'responsesByDate', '{}'::jsonb,
        'questionAnalytics', '{}'::jsonb
    ),
    'system',
    NOW(),
    NOW()
);

-- Create views for common queries
CREATE VIEW member_communication_summary AS
SELECT
    m.id as member_id,
    m.first_name,
    m.last_name,
    COUNT(DISTINCT c.id) as total_communications,
    COUNT(CASE WHEN c.status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN c.status = 'read' THEN 1 END) as read_count,
    COUNT(CASE WHEN c.priority = 'urgent' THEN 1 END) as urgent_count,
    COUNT(CASE WHEN c.type = 'email' THEN 1 END) as email_count,
    COUNT(CASE WHEN c.type = 'sms' THEN 1 END) as sms_count,
    COUNT(CASE WHEN c.type = 'push' THEN 1 END) as push_count,
    MAX(c.created_at) as last_communication_at
FROM members m
LEFT JOIN communications c ON m.id = c.member_id
GROUP BY m.id, m.first_name, m.last_name;

CREATE VIEW communication_performance_metrics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_communications,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced_count,
    COUNT(CASE WHEN status = 'spam' THEN 1 END) as spam_count
FROM communications
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;