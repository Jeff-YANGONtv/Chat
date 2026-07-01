# Telegram Media File Integration Guide

## Overview

This guide explains how to integrate Telegram media file support into your JB Hub chat application. Users can now send and view photos, videos, audio files, documents, and animations directly in the chat UI.

## Architecture

### Backend Flow

```
Telegram Message (with media)
    ↓
Webhook Handler (/webhook)
    ↓
Extract Media Info (file_id, type, size, etc.)
    ↓
Store in Database (chat_messages table)
    ↓
Frontend Requests Messages (/api/messages/:chatId)
    ↓
Backend Resolves Media URLs (/api/media/resolve)
    ↓
Frontend Renders Media in Chat
```

## Database Changes

### New Columns in `chat_messages` Table

The enhanced schema adds these columns to store media metadata:

| Column | Type | Description |
|--------|------|-------------|
| `media_type` | VARCHAR(50) | Type of media: `photo`, `video`, `audio`, `voice`, `document`, `animation` |
| `media_file_id` | TEXT | Telegram's unique file_id (used to retrieve the file) |
| `media_file_name` | VARCHAR(255) | Original filename (for documents) |
| `media_mime_type` | VARCHAR(100) | MIME type (e.g., `image/jpeg`, `video/mp4`) |
| `media_size` | BIGINT | File size in bytes |
| `media_url` | TEXT | Resolved CDN URL (computed by backend) |

### Migration Steps

1. **Backup your current database** (in Supabase: Project → Backups)

2. **Run the enhanced schema** in Supabase SQL Editor:
   - Copy contents of `schema_enhanced.sql`
   - Paste into Supabase SQL Editor
   - Click "Run"

   This will:
   - Drop existing tables (⚠️ backs up data first!)
   - Create new tables with media columns
   - Re-insert seed data

3. **Alternative: Minimal Migration** (if you want to keep existing data)
   ```sql
   -- Add media columns to existing chat_messages table
   ALTER TABLE chat_messages ADD COLUMN media_type VARCHAR(50);
   ALTER TABLE chat_messages ADD COLUMN media_file_id TEXT;
   ALTER TABLE chat_messages ADD COLUMN media_file_name VARCHAR(255);
   ALTER TABLE chat_messages ADD COLUMN media_mime_type VARCHAR(100);
   ALTER TABLE chat_messages ADD COLUMN media_size BIGINT;
   ALTER TABLE chat_messages ADD COLUMN media_url TEXT;
   
   -- Add photo_url column to customer_chats
   ALTER TABLE customer_chats ADD COLUMN photo_url TEXT;
   
   -- Create index for media queries
   CREATE INDEX idx_chat_messages_media_type ON chat_messages(media_type) WHERE media_type IS NOT NULL;
   ```

## Backend Implementation

### Replace `api/index.js`

1. **Backup your current** `api/index.js`
2. **Copy** `api/index_enhanced.js` to `api/index.js`
3. **Redeploy** to Vercel

### Key Features Added

#### 1. Media URL Caching
- Resolves Telegram `file_id` to CDN URLs
- Caches URLs for 1 hour (reduces API calls)
- Supports multiple bot tokens

#### 2. Media Extraction
- Automatically extracts media info from Telegram messages
- Supports: photos, videos, audio, voice, documents, animations
- Stores metadata for UI rendering

#### 3. New Endpoints

**POST `/api/media/resolve`**
- Resolve a Telegram `file_id` to a downloadable URL
- Request:
  ```json
  {
    "file_id": "AgADBAADr6cxG...",
    "bot_source": "bot1"
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "file_id": "AgADBAADr6cxG...",
    "media_url": "https://api.telegram.org/file/bot123.../...",
    "bot_source": "bot1"
  }
  ```

#### 4. Enhanced Message Endpoints

**GET `/api/messages/:chatId`**
- Now returns messages with resolved media URLs
- Each message with media includes `media_url` field
- Example response:
  ```json
  {
    "id": 1,
    "chat_id": "123456",
    "sender": "customer",
    "message_text": "[media]",
    "media_type": "photo",
    "media_file_id": "AgADBAADr6cxG...",
    "media_file_name": null,
    "media_mime_type": "image/jpeg",
    "media_size": 102400,
    "media_url": "https://api.telegram.org/file/bot123.../photos/file_123.jpg",
    "created_at": "2026-07-01T10:30:00Z"
  }
  ```

## Frontend Implementation

### 1. Update Message Display Component

```javascript
// Example: React component for rendering messages with media

function ChatMessage({ message }) {
  const { media_type, media_url, media_file_name, message_text } = message;

  return (
    <div className="message">
      {/* Text content */}
      {message_text && message_text !== '[media]' && (
        <p className="message-text">{message_text}</p>
      )}

      {/* Media rendering */}
      {media_type && media_url && (
        <div className="message-media">
          {media_type === 'photo' && (
            <img 
              src={media_url} 
              alt="Photo" 
              style={{ maxWidth: '300px', borderRadius: '8px' }}
            />
          )}

          {media_type === 'video' && (
            <video 
              width="300" 
              controls 
              style={{ borderRadius: '8px' }}
            >
              <source src={media_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}

          {media_type === 'audio' && (
            <audio controls style={{ width: '100%' }}>
              <source src={media_url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          )}

          {media_type === 'voice' && (
            <audio controls style={{ width: '100%' }}>
              <source src={media_url} type="audio/ogg" />
              Your browser does not support the audio element.
            </audio>
          )}

          {media_type === 'document' && (
            <a 
              href={media_url} 
              download={media_file_name}
              className="document-link"
            >
              📄 {media_file_name || 'Download Document'}
            </a>
          )}

          {media_type === 'animation' && (
            <img 
              src={media_url} 
              alt="Animation" 
              style={{ maxWidth: '300px', borderRadius: '8px' }}
            />
          )}
        </div>
      )}

      {/* Timestamp */}
      <span className="message-time">
        {new Date(message.created_at).toLocaleTimeString()}
      </span>
    </div>
  );
}
```

### 2. Update Message Fetching

```javascript
// Fetch messages with media URLs resolved

async function fetchMessages(chatId) {
  try {
    const response = await fetch(`/api/messages/${chatId}`);
    const messages = await response.json();
    
    // Messages now include media_url field
    // No need for additional media resolution calls
    
    return messages;
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return [];
  }
}
```

### 3. CSS Styling (Optional)

```css
.message-media {
  margin-top: 8px;
  margin-bottom: 8px;
}

.message-media img,
.message-media video {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-media audio {
  width: 100%;
  margin: 8px 0;
}

.document-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f0f0f0;
  border-radius: 6px;
  text-decoration: none;
  color: #0084ff;
  font-weight: 500;
  transition: background-color 0.2s;
}

.document-link:hover {
  background-color: #e0e0e0;
}
```

## Deployment Steps

### 1. Update Database Schema

In Supabase SQL Editor:
```sql
-- Run the minimal migration script (see above)
-- OR run schema_enhanced.sql if you want a fresh start
```

### 2. Update Backend Code

```bash
# In your Chat repository
cp api/index_enhanced.js api/index.js
git add api/index.js
git commit -m "feat: add Telegram media file support"
git push
```

### 3. Redeploy to Vercel

```bash
# Option 1: Automatic (if connected to GitHub)
# Just push, Vercel will auto-deploy

# Option 2: Manual
vercel --prod
```

### 4. Update Frontend

Update your chat UI component to use the new `media_url` field and render media according to the examples above.

## Testing

### 1. Send a Photo to Your Bot

```bash
# Use Telegram bot to send a photo to your chat
# The webhook will capture it
```

### 2. Check Database

In Supabase, verify the message was stored:
```sql
SELECT * FROM chat_messages 
WHERE media_type IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

You should see:
- `media_type`: `photo`
- `media_file_id`: Telegram's file ID
- `media_url`: Resolved CDN URL

### 3. Fetch Messages

```bash
curl "https://your-vercel-url/api/messages/YOUR_CHAT_ID"
```

Response should include messages with `media_url` field.

### 4. Test UI

- Open your chat app
- Messages with media should display photos, videos, etc.
- Click/tap to view full size

## Troubleshooting

### Media URLs Not Resolving

**Problem**: `media_url` is null or empty

**Solutions**:
1. Check bot token is correct in environment variables
2. Verify bot has access to the file (file might be deleted)
3. Check Telegram API rate limits (may need to wait)
4. Review backend logs in Vercel dashboard

### Media Not Displaying in UI

**Problem**: Media elements show but don't load

**Solutions**:
1. Check browser console for CORS errors
2. Verify media URL is accessible (test in browser)
3. Check media MIME type is correct
4. Ensure media file still exists on Telegram servers

### Large Files Timing Out

**Problem**: Videos or large files timeout

**Solutions**:
1. Telegram Bot API has 20MB limit for `getFile`
2. For larger files, use local Telegram Bot API server
3. Consider streaming video instead of downloading

## Performance Optimization

### 1. Implement Lazy Loading

```javascript
// Load media only when visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

### 2. Add Thumbnails for Videos

```javascript
// Use video thumbnail from Telegram
if (message.media_type === 'video' && message.thumbnail) {
  // Display thumbnail until user clicks play
}
```

### 3. Cache Media URLs

The backend already caches URLs for 1 hour, but you can add frontend caching:

```javascript
const mediaUrlCache = new Map();

async function getMediaUrl(fileId, botSource) {
  const cacheKey = `${fileId}:${botSource}`;
  
  if (mediaUrlCache.has(cacheKey)) {
    return mediaUrlCache.get(cacheKey);
  }

  const response = await fetch('/api/media/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, bot_source: botSource }),
  });

  const data = await response.json();
  mediaUrlCache.set(cacheKey, data.media_url);
  return data.media_url;
}
```

## Security Considerations

### 1. Bot Token Protection

✅ **Already handled**: Bot token is only used on backend
❌ **Never**: Expose bot token in frontend code

### 2. File Access Control

- Media URLs are public (Telegram CDN)
- Consider adding authentication if needed
- Implement rate limiting on media endpoints

### 3. File Size Limits

- Current limit: 20MB (Telegram Bot API)
- Configure in backend: `limits: { fileSize: 20 * 1024 * 1024 }`

## Supported Media Types

| Type | Extension | MIME Type | Display |
|------|-----------|-----------|---------|
| Photo | jpg, png, gif | image/* | `<img>` |
| Video | mp4, mov, webm | video/* | `<video>` with controls |
| Audio | mp3, m4a, wav | audio/* | `<audio>` with controls |
| Voice | ogg, m4a | audio/* | `<audio>` with controls |
| Document | pdf, doc, zip, etc. | application/* | Download link |
| Animation | gif, webp | image/gif | `<img>` or `<video>` |

## API Reference

### POST `/api/media/resolve`

Resolve Telegram `file_id` to downloadable URL.

**Request**:
```json
{
  "file_id": "AgADBAADr6cxG...",
  "bot_source": "bot1"
}
```

**Response**:
```json
{
  "ok": true,
  "file_id": "AgADBAADr6cxG...",
  "media_url": "https://api.telegram.org/file/bot123.../...",
  "bot_source": "bot1"
}
```

### GET `/api/messages/:chatId`

Fetch all messages in a chat (now with media URLs).

**Response**:
```json
[
  {
    "id": 1,
    "chat_id": "123456",
    "sender": "customer",
    "message_text": "Check this photo!",
    "media_type": "photo",
    "media_file_id": "AgADBAADr6cxG...",
    "media_url": "https://api.telegram.org/file/bot123.../...",
    "created_at": "2026-07-01T10:30:00Z"
  }
]
```

## Support & Troubleshooting

For issues or questions:
1. Check browser console for errors
2. Review Vercel function logs
3. Verify Supabase database schema
4. Test with curl or Postman
5. Check Telegram Bot API status

## Next Steps

1. ✅ Update database schema
2. ✅ Replace backend code
3. ✅ Update frontend components
4. ✅ Test with real media
5. ✅ Deploy to production
6. 🎉 Enjoy media-rich chat!
