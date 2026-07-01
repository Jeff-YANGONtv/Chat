-- ============================================================
-- TELEGRAM MINI APP: AD NETWORK HUB + LIVE CHAT ROUTER
-- ENHANCED WITH MEDIA FILE SUPPORT
-- Supabase / PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS customer_chats CASCADE;
DROP TABLE IF EXISTS ads_management CASCADE;

-- ------------------------------------------------------------
-- 1. CUSTOMER CHATS
-- ------------------------------------------------------------
CREATE TABLE customer_chats (
    id              SERIAL PRIMARY KEY,
    chat_id         TEXT NOT NULL UNIQUE,
    username        VARCHAR(255) DEFAULT '',
    customer_name   VARCHAR(255) DEFAULT '',
    last_message    TEXT DEFAULT '',
    bot_source      VARCHAR(50)  DEFAULT 'bot1',
    chat_type       VARCHAR(20)  DEFAULT 'private',
    photo_url       TEXT,
    unread_count    INTEGER      DEFAULT 0,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_chats_updated ON customer_chats(updated_at DESC);
CREATE INDEX idx_customer_chats_type    ON customer_chats(chat_type);

-- ------------------------------------------------------------
-- 2. CHAT MESSAGES (ENHANCED WITH MEDIA SUPPORT)
-- ------------------------------------------------------------
CREATE TABLE chat_messages (
    id                  SERIAL PRIMARY KEY,
    chat_id             TEXT NOT NULL,
    sender              VARCHAR(20) NOT NULL,
    message_text        TEXT NOT NULL,
    bot_source          VARCHAR(50) DEFAULT 'bot1',
    
    -- Media fields (NEW)
    media_type          VARCHAR(50),           -- photo, video, audio, voice, document, animation
    media_file_id       TEXT,                  -- Telegram file_id
    media_file_name     VARCHAR(255),          -- Original filename
    media_mime_type     VARCHAR(100),          -- MIME type (image/jpeg, video/mp4, etc.)
    media_size          BIGINT,                -- File size in bytes
    media_url           TEXT,                  -- Resolved CDN URL (computed)
    
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id, created_at);
CREATE INDEX idx_chat_messages_media_type ON chat_messages(media_type) WHERE media_type IS NOT NULL;

-- ------------------------------------------------------------
-- 3. ADS MANAGEMENT
-- ------------------------------------------------------------
CREATE TABLE ads_management (
    id                SERIAL PRIMARY KEY,
    channel_name      VARCHAR(255) NOT NULL,
    telegram_link     TEXT,
    logo_url          TEXT,
    address           TEXT DEFAULT '',
    ads1              VARCHAR(255) DEFAULT '',
    ads1_fees         NUMERIC      DEFAULT 0,
    ads1_duration     VARCHAR(100) DEFAULT '',
    ads1_posts        VARCHAR(100) DEFAULT '',
    ads2              VARCHAR(255) DEFAULT '',
    ads2_fees         NUMERIC      DEFAULT 0,
    ads2_duration     VARCHAR(100) DEFAULT '',
    ads2_posts        VARCHAR(100) DEFAULT '',
    ads3              VARCHAR(255) DEFAULT '',
    ads3_fees         NUMERIC      DEFAULT 0,
    ads3_duration     VARCHAR(100) DEFAULT '',
    ads3_posts        VARCHAR(100) DEFAULT '',
    ads4              VARCHAR(255) DEFAULT '',
    ads4_fees         NUMERIC      DEFAULT 0,
    ads4_duration     VARCHAR(100) DEFAULT '',
    ads4_posts        VARCHAR(100) DEFAULT '',
    payment_method    VARCHAR(255) DEFAULT '',
    telegram_file_id  TEXT,
    media_backup_url  TEXT,
    updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ads_management_updated ON ads_management(updated_at DESC);

-- ------------------------------------------------------------
-- 4. INITIAL SEED DATA
-- ------------------------------------------------------------
INSERT INTO ads_management (channel_name, telegram_link, logo_url) VALUES
('JAV BURMA',              'https://t.me/javburma',          'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV BURMA (2)',          'https://t.me/javburmatwo',       'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV BURMA (3)',          'https://t.me/javburmathree',     'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV BURMA CHANNEL',      'https://t.me/JavBurmaChannel',   'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV BURMA (5)',          'https://t.me/javburmafive',      'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV BURMABOARD',         'https://t.me/javburmaboard',     'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV BURMA MILF',         'https://t.me/+gqaoDbKljvM2ZDM9', 'https://i.ibb.co/7Ny2y0wC/IMG-20260201-115744-136.jpg'),
('JAV TV',                 'https://t.me/japanesemovieTv',   'https://i.ibb.co/bMnKhVJn/IMG-20260201-121820-790.jpg'),
('MMSUB JAV 01',           'https://t.me/mmsubjav01',        'https://i.ibb.co/237P3jdp/IMG-20260201-120944-428.jpg'),
('MMSUB JAV 03',           'https://t.me/mmsubjav03',        'https://i.ibb.co/BHp2dC7j/IMG-20260201-121039-966.jpg'),
('JPXTV',                  'https://t.me/JPXTV',             'https://i.ibb.co/FkWPJy0y/IMG-20260201-120600-643.jpg'),
('JPXTV 2',                'https://t.me/jpxtvtwo',          'https://i.ibb.co/FkWPJy0y/IMG-20260201-120600-643.jpg'),
('JPXTV 3',                'https://t.me/JPXTV03',           'https://i.ibb.co/FkWPJy0y/IMG-20260201-120600-643.jpg'),
('JPX MOVIES',             'https://t.me/jpxmovies',         'https://i.ibb.co/FkWPJy0y/IMG-20260201-120600-643.jpg'),
('REDX TV',                'https://t.me/redxtv',            'https://i.ibb.co/Y4wG8Lgg/IMG-20260201-120726-097.jpg'),
('REDX TV (2)',            'https://t.me/redxtv02',          'https://i.ibb.co/Y4wG8Lgg/IMG-20260201-120726-097.jpg'),
('JAV MMSUBS',             'https://t.me/javmmsubs',         'https://i.ibb.co/3920ys9W/IMG-20260201-122359-795.jpg'),
('MYANMAR HD I',           'https://t.me/myanmarhdi',        'https://i.ibb.co/Q3BSRn4k/IMG-20260201-121259-210.jpg'),
('MYANMAR HD FREELINK',    'https://t.me/myanmarhdfreelink', 'https://i.ibb.co/0RmT6Fmc/IMG-20260201-121213-700.jpg'),
('XMOVIE PLUS',            'https://t.me/xmovieplusfree',    'https://i.ibb.co/Wvbnr1tn/IMG-20260201-120448-259.jpg'),
('XMOVIE PLEX',            'https://t.me/xmovieplex',        'https://i.ibb.co/ZR7QHzZK/IMG-20260201-122558-822.jpg'),
('ACTION CAR MMSUB',       'https://t.me/actioncar_mmsub',   'https://i.ibb.co/Y4XM9Pvs/IMG-20260201-121950-643.jpg'),
('JAV 959',                'https://t.me/jav959',            'https://i.ibb.co/Vcg8bbfc/IMG-20260201-122317-245.jpg'),
('MMSUB 1821',             'https://t.me/mmsub_1821',        'https://i.ibb.co/DDKBTFXL/IMG-20260201-122207-910.jpg'),
('JAV MMSUB 01',           'https://t.me/+-SXSzW5JsQ02Y2E1', 'https://i.ibb.co/7t5n93KD/IMG-20260201-123122-836.jpg'),
('JAV MMSUB 02',           'https://t.me/+r1QeigJbGTw4NWJl', 'https://i.ibb.co/7t5n93KD/IMG-20260201-123122-836.jpg'),
('JAV MMSUB 03',           'https://t.me/+jiF-7k04uLhjOGRl', 'https://i.ibb.co/7t5n93KD/IMG-20260201-123122-836.jpg'),
('JAV MMSUB 04',           'https://t.me/+Z6hP5dkg0fM5Mjg1', 'https://i.ibb.co/7t5n93KD/IMG-20260201-123122-836.jpg'),
('JAV MMSUB 05',           'https://t.me/+yWtOvdNB0NoyMTll', 'https://i.ibb.co/7t5n93KD/IMG-20260201-123122-836.jpg'),
('DARKFLIX',               'https://t.me/+knN9NUBubpI5Zjhl', 'https://i.ibb.co/wFS15SBX/IMG-20260201-122746-092.jpg'),
('VIVAMAX BURMA',          'https://t.me/vivamaxburma',      'https://i.ibb.co/9kYPQMSt/IMG-20260201-120654-600.jpg'),
('စာတန်းထိုးကားများ',       'https://t.me/c/2014477597/2979', 'https://i.ibb.co/Y4XM9Pvs/IMG-20260201-121950-643.jpg'),
('TELEMOVIE BURMA',        'https://t.me/telemovieBurma',    'https://i.ibb.co/vvspZbDZ/IMG-20260201-121440-729.jpg'),
('VELVET STREAM',          'https://t.me/+RmSstqlK8GBjNTc1', 'https://i.ibb.co/wFS15SBX/IMG-20260201-122746-092.jpg'),
('PRIME VIBE',             'https://t.me/+RpLwUz3QiGA1NmZl', 'https://i.ibb.co/wFS15SBX/IMG-20260201-122746-092.jpg');
