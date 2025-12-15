-- Wellness Integration Schema for Member Engagement Hub
-- This file defines the database schema for wellness program integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wellness Integrations Table
CREATE TABLE wellness_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('fitbit', 'apple_health', 'google_fit', 'samsung_health', 'garmin_connect')),
    is_connected BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    data_types TEXT[] DEFAULT '{}',
    permissions TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Health Data Table
CREATE TABLE health_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Goals Table
CREATE TABLE health_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness Incentives Table
CREATE TABLE wellness_incentives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('physical', 'mental', 'nutrition', 'sleep', 'social', 'preventive')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('challenge', 'goal', 'habit')),
    points INTEGER NOT NULL DEFAULT 0,
    target_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    rewards TEXT[] DEFAULT '{}',
    icon VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Incentive Progress Table
CREATE TABLE user_incentive_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incentive_id UUID NOT NULL REFERENCES wellness_incentives(id) ON DELETE CASCADE,
    current_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, incentive_id)
);

-- Wellness Rewards Table
CREATE TABLE wellness_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('fitness', 'nutrition', 'retail', 'education', 'services')),
    points_cost INTEGER NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('gift_card', 'voucher', 'product', 'service')),
    available BOOLEAN DEFAULT true,
    image VARCHAR(255),
    description_long TEXT,
    terms TEXT,
    partner_name VARCHAR(255),
    expiry_date TIMESTAMP WITH TIME ZONE,
    inventory_count INTEGER DEFAULT -1, -- -1 for unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Reward Claims Table
CREATE TABLE user_reward_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES wellness_rewards(id) ON DELETE CASCADE,
    points_deducted INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'shipped', 'delivered', 'cancelled')),
    claim_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmation_code VARCHAR(50),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness Coaches Table
CREATE TABLE wellness_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    credentials TEXT NOT NULL,
    specialties TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{English}',
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0, -- years
    session_price DECIMAL(8,2) NOT NULL,
    introductory_price DECIMAL(8,2),
    image VARCHAR(255),
    bio TEXT,
    availability VARCHAR(20) DEFAULT 'available' CHECK (availability IN ('available', 'limited', 'unavailable')),
    next_available_slot TIMESTAMP WITH TIME ZONE,
    certifications TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coach Available Slots Table
CREATE TABLE coach_available_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('initial', 'followup', 'group')),
    available BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 1,
    current_participants INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_participants CHECK (current_participants <= max_participants)
);

-- Coaching Sessions Table
CREATE TABLE coaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES wellness_coaches(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES coach_available_slots(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('initial', 'followup', 'group')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    join_url VARCHAR(500),
    recording_url VARCHAR(500),
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,
    feedback_timestamp TIMESTAMP WITH TIME ZONE,
    price DECIMAL(8,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_session_time CHECK (end_time > start_time)
);

-- User Wellness Profile Table
CREATE TABLE user_wellness_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges TEXT[] DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness Notifications Table
CREATE TABLE wellness_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Device Sync Logs Table
CREATE TABLE device_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES wellness_integrations(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    sync_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_wellness_integrations_user_id ON wellness_integrations(user_id);
CREATE INDEX idx_wellness_integrations_provider ON wellness_integrations(provider);
CREATE INDEX idx_health_data_user_id ON health_data(user_id);
CREATE INDEX idx_health_data_type ON health_data(type);
CREATE INDEX idx_health_data_timestamp ON health_data(timestamp);
CREATE INDEX idx_health_data_source ON health_data(source);
CREATE INDEX idx_health_goals_user_id ON health_goals(user_id);
CREATE INDEX idx_user_incentive_progress_user_id ON user_incentive_progress(user_id);
CREATE INDEX idx_user_incentive_progress_incentive_id ON user_incentive_progress(incentive_id);
CREATE INDEX idx_user_reward_claims_user_id ON user_reward_claims(user_id);
CREATE INDEX idx_user_reward_claims_reward_id ON user_reward_claims(reward_id);
CREATE INDEX idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX idx_coaching_sessions_coach_id ON coaching_sessions(coach_id);
CREATE INDEX idx_coach_available_slots_coach_id ON coach_available_slots(coach_id);
CREATE INDEX idx_coach_available_slots_time ON coach_available_slots(start_time, end_time);
CREATE INDEX idx_wellness_notifications_user_id ON wellness_notifications(user_id);
CREATE INDEX idx_wellness_notifications_read ON wellness_notifications(read);
CREATE INDEX idx_device_sync_logs_user_id ON device_sync_logs(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_health_data_user_type_timestamp ON health_data(user_id, type, timestamp DESC);
CREATE INDEX idx_coaching_sessions_user_time ON coaching_sessions(user_id, start_time DESC);
CREATE INDEX idx_user_incentive_progress_status ON user_incentive_progress(user_id, status);

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all relevant tables
CREATE TRIGGER update_wellness_integrations_updated_at BEFORE UPDATE ON wellness_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_goals_updated_at BEFORE UPDATE ON health_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_incentives_updated_at BEFORE UPDATE ON wellness_incentives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_incentive_progress_updated_at BEFORE UPDATE ON user_incentive_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_rewards_updated_at BEFORE UPDATE ON wellness_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reward_claims_updated_at BEFORE UPDATE ON user_reward_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_coaches_updated_at BEFORE UPDATE ON wellness_coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_available_slots_updated_at BEFORE UPDATE ON coach_available_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON coaching_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wellness_profiles_updated_at BEFORE UPDATE ON user_wellness_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO wellness_coaches (name, credentials, specialties, languages, rating, review_count, experience, session_price, introductory_price, bio, availability) VALUES
('Sarah Johnson', 'Certified Wellness Coach, RYT-500', ARRAY['yoga', 'meditation', 'stress_management'], ARRAY['English'], 4.9, 127, 8, 75.00, 50.00, 'Sarah specializes in holistic wellness combining physical fitness with mental clarity.', 'available'),
('Michael Chen', 'MS, CNS, Certified Nutritionist', ARRAY['nutrition', 'weight_management', 'meal_planning'], ARRAY['English', 'Mandarin'], 4.8, 89, 6, 85.00, 60.00, 'Michael helps clients achieve their health goals through evidence-based nutrition coaching.', 'available'),
('Emma Rodriguez', 'NASM-CPT, Behavioral Change Specialist', ARRAY['fitness', 'behavior_change', 'motivation'], ARRAY['English', 'Spanish'], 4.7, 156, 10, 80.00, 55.00, 'Emma focuses on creating sustainable fitness habits and transforming lifestyle patterns.', 'limited');

INSERT INTO wellness_rewards (title, description, category, points_cost, value, type, available, image, description_long, terms, partner_name) VALUES
('Coffee Shop Gift Card', '$10 gift card to local coffee shop', 'retail', 500, 10.00, 'gift_card', true, '/rewards/coffee.jpg', 'Enjoy a complimentary coffee at participating locations. Valid for 6 months.', 'One per customer per month. Non-transferable.', 'Local Coffee Co.'),
('Fitness Class Pass', 'Free fitness class at partner gym', 'fitness', 750, 25.00, 'voucher', true, '/rewards/fitness.jpg', 'Access any group fitness class at our partner gym locations. Includes yoga, cycling, and strength training.', 'Valid for 3 months. Reservation required.', 'FitLife Gym'),
('Wellness Book Bundle', 'Collection of wellness and nutrition books', 'education', 1000, 40.00, 'product', true, '/rewards/books.jpg', 'Curated collection of best-selling wellness books covering nutrition, exercise, and mental health.', 'While supplies last. Digital or physical version available.', 'Wellness Publishing');

INSERT INTO wellness_incentives (title, description, category, type, points, target_value, unit, requirements, rewards, icon) VALUES
('Daily Steps Challenge', 'Walk 10,000 steps for 7 consecutive days', 'physical', 'challenge', 100, 70000, 'steps', ARRAY['10,000 steps daily', '7 consecutive days'], ARRAY['100 wellness points', 'Digital badge'], 'walking'),
('Sleep Quality Improvement', 'Average 7+ hours of sleep for 30 days', 'sleep', 'goal', 150, 7, 'hours', ARRAY['7+ hours average sleep', '30 day period'], ARRAY['150 wellness points', 'Sleep tracking premium'], 'sleep'),
('Mindfulness Monday', 'Complete 10-minute mindfulness session every Monday', 'mental', 'habit', 50, 4, 'sessions', ARRAY['10-minute session', 'Every Monday'], ARRAY['50 wellness points', 'Meditation app access'], 'meditation');