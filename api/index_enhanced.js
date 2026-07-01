// ============================================================
// JB HUB — Vercel Serverless API (ENHANCED WITH MEDIA SUPPORT)
// Handles: /webhook, /api/chats, /api/messages/:id,
// /api/send-message, /api/ads, /api/wallet-summary,
// /api/wallet-history, /api/update-cell, /api/add-row,
// /api/delete-row/:id, /api/upload-media/:id,
// /api/get-media-url/:file_id, /api/admin-auth,
// /api/media/resolve (NEW - Media file resolver)
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');
const fetch = require('node-fetch');
const Busboy = require('busboy');

// ---------- ENV ----------
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_KEY        = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const BOT_TOKEN_1         = process.env.BOT_TOKEN_1;
const BOT_TOKEN_2         = process.env.BOT_TOKEN_2;
const BOT_TOKEN_3         = process.env.BOT_TOKEN_3;
const ADMIN_PASSWORD      = process.env.ADMIN_PASSWORD || 'JB2026@ADMIN';

const BOT_TOKENS = { bot1: BOT_TOKEN_1, bot2: BOT_TOKEN_2, bot3: BOT_TOKEN_3 };

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '', {
  auth: { persistSession: false },
});

// ---------- CACHE FOR MEDIA URLs (In-memory cache) ----------
const mediaUrlCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

function getCachedMediaUrl(fileId) {
  const cached = mediaUrlCache.get(fileId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url;
  }
  mediaUrlCache.delete(fileId);
  return null;
}

function setCachedMediaUrl(fileId, url) {
  mediaUrlCache.set(fileId, { url, timestamp: Date.now() });
}

// ---------- HELPERS ----------
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });
    let fileBuffer = null;
    let fileName = 'upload.bin';
    let mimeType = 'application/octet-stream';
    const fields = {};

    bb.on('file', (name, file, info) => {
      fileName = info.filename || fileName;
      mimeType = info.mimeType || mimeType;
      const chunks = [];
      file.on('data', c => chunks.push(c));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('finish', () => resolve({ fileBuffer, fileName, mimeType, fields }));
    bb.on('error', reject);

    req.pipe(bb);
  });
}

// ---------- TELEGRAM ----------
async function tgApi(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function tgSendPhoto(token, chatId, buffer, filename, caption = '') {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('photo', buffer, { filename });
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST', body: form, headers: form.getHeaders(),
  });
  return res.json();
}

async function tgGetFile(token, fileId) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  return res.json();
}

/**
 * Resolve Telegram file_id to actual download URL
 * Supports caching and multiple bot tokens
 */
async function resolveMediaUrl(fileId, botKey = 'bot1') {
  try {
    // Check cache first
    const cachedUrl = getCachedMediaUrl(fileId);
    if (cachedUrl) {
      console.log(`[CACHE HIT] Media URL for ${fileId}`);
      return cachedUrl;
    }

    const token = BOT_TOKENS[botKey];
    if (!token) throw new Error(`Invalid bot key: ${botKey}`);

    const fileInfo = await tgGetFile(token, fileId);
    if (!fileInfo.ok) {
      throw new Error(`Telegram API error: ${fileInfo.description}`);
    }

    const filePath = fileInfo.result.file_path;
    const mediaUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // Cache the URL
    setCachedMediaUrl(fileId, mediaUrl);
    console.log(`[SUCCESS] Resolved media URL for ${fileId}`);

    return mediaUrl;
  } catch (error) {
    console.error(`[ERROR] Failed to resolve media URL: ${error.message}`);
    throw error;
  }
}

/**
 * Extract media information from Telegram message
 */
function extractMediaFromMessage(message) {
  const media = {
    type: null,
    file_id: null,
    file_name: null,
    mime_type: null,
    size: null,
    thumbnail: null,
  };

  if (message.photo) {
    // Get the largest photo resolution
    const largestPhoto = message.photo[message.photo.length - 1];
    media.type = 'photo';
    media.file_id = largestPhoto.file_id;
    media.size = largestPhoto.file_size;
  } else if (message.video) {
    media.type = 'video';
    media.file_id = message.video.file_id;
    media.file_name = message.video.file_name;
    media.mime_type = message.video.mime_type;
    media.size = message.video.file_size;
    if (message.video.thumb) {
      media.thumbnail = {
        file_id: message.video.thumb.file_id,
        width: message.video.thumb.width,
        height: message.video.thumb.height,
      };
    }
  } else if (message.audio) {
    media.type = 'audio';
    media.file_id = message.audio.file_id;
    media.file_name = message.audio.file_name;
    media.mime_type = message.audio.mime_type;
    media.size = message.audio.file_size;
  } else if (message.voice) {
    media.type = 'voice';
    media.file_id = message.voice.file_id;
    media.mime_type = message.voice.mime_type;
    media.size = message.voice.file_size;
  } else if (message.document) {
    media.type = 'document';
    media.file_id = message.document.file_id;
    media.file_name = message.document.file_name;
    media.mime_type = message.document.mime_type;
    media.size = message.document.file_size;
  } else if (message.animation) {
    media.type = 'animation';
    media.file_id = message.animation.file_id;
    media.file_name = message.animation.file_name;
    media.mime_type = message.animation.mime_type;
    media.size = message.animation.file_size;
  }

  return media.type ? media : null;
}

const ALLOWED_COLS = new Set([
  'channel_name','telegram_link','logo_url','address',
  'ads1','ads1_fees','ads1_duration','ads1_posts',
  'ads2','ads2_fees','ads2_duration','ads2_posts',
  'ads3','ads3_fees','ads3_duration','ads3_posts',
  'ads4','ads4_fees','ads4_duration','ads4_posts',
  'payment_method','telegram_file_id','media_backup_url',
]);

// ============================================================
//                       MAIN HANDLER
// ============================================================
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    // ---------- WEBHOOK ----------
    if (path === '/webhook' && req.method === 'POST') {
      const botKey = (url.searchParams.get('bot') || 'bot1').toLowerCase();
      const token  = BOT_TOKENS[botKey];
      if (!token) return json(res, 400, { error: 'Unknown bot' });

      const update  = await readJson(req);
      const message = update.message || update.edited_message || update.channel_post;
      if (!message) return json(res, 200, { ok: true });

      const chatId       = String(message.chat.id);
      const chatType     = chatId.startsWith('-') ? 'group' : 'private';
      const isGroup      = chatType === 'group';
      const customerName = isGroup
        ? (message.chat.title || 'Group')
        : `${message.from?.first_name || ''} ${message.from?.last_name || ''}`.trim() || 'User';
      const username     = message.from?.username || message.chat?.username || '';
      const messageText  = message.text || message.caption || '[media]';

      // Extract media information if present
      const mediaInfo = extractMediaFromMessage(message);

      // Fetch Profile Photo URL
      let photoUrl = '';
      try {
        const userId = message.from?.id || message.chat.id;
        const photoRes = await tgApi(token, isGroup ? 'getChat' : 'getUserProfilePhotos', isGroup ? { chat_id: chatId } : { user_id: userId, limit: 1 });
        
        let fileId = '';
        if (isGroup && photoRes.result?.photo?.big_file_id) {
          fileId = photoRes.result.photo.big_file_id;
        } else if (!isGroup && photoRes.result?.total_count > 0) {
          fileId = photoRes.result.photos[0][0].file_id;
        }

        if (fileId) {
          photoUrl = await resolveMediaUrl(fileId, botKey);
        }
      } catch (e) { console.error('Photo fetch error:', e); }

      const { data: existing } = await supabase
        .from('customer_chats').select('id, unread_count').eq('chat_id', chatId).maybeSingle();

      if (existing) {
        await supabase.from('customer_chats').update({
          username, 
          customer_name: customerName, 
          last_message: messageText,
          bot_source: botKey, 
          chat_type: chatType, 
          photo_url: photoUrl || undefined,
          unread_count: (existing.unread_count || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('chat_id', chatId);
      } else {
        await supabase.from('customer_chats').insert({
          chat_id: chatId, 
          username, 
          customer_name: customerName,
          last_message: messageText, 
          bot_source: botKey, 
          chat_type: chatType, 
          photo_url: photoUrl,
          unread_count: 1,
          updated_at: new Date().toISOString(),
        });
      }

      // Store message with media info
      const messageData = {
        chat_id: chatId,
        sender: 'customer',
        message_text: messageText,
        bot_source: botKey,
      };

      // Add media information if present
      if (mediaInfo) {
        messageData.media_type = mediaInfo.type;
        messageData.media_file_id = mediaInfo.file_id;
        messageData.media_file_name = mediaInfo.file_name;
        messageData.media_mime_type = mediaInfo.mime_type;
        messageData.media_size = mediaInfo.size;
      }

      await supabase.from('chat_messages').insert(messageData);

      return json(res, 200, { ok: true });
    }

    // ---------- CHATS ----------
    if (path === '/api/chats' && req.method === 'GET') {
      const type = url.searchParams.get('type') === 'group' ? 'group' : 'private';
      const { data, error } = await supabase
        .from('customer_chats')
        .select('*')
        .eq('chat_type', type)
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, data || []);
    }

    // ---------- MESSAGES ----------
    if (path.startsWith('/api/messages/') && req.method === 'GET') {
      const chatId = decodeURIComponent(path.replace('/api/messages/', ''));
      const { data, error } = await supabase
        .from('chat_messages').select('*').eq('chat_id', chatId)
        .order('created_at', { ascending: true }).limit(500);
      if (error) return json(res, 500, { error: error.message });
      
      // Resolve media URLs for all messages with media
      const processedData = await Promise.all((data || []).map(async (msg) => {
        if (msg.media_file_id) {
          try {
            const mediaUrl = await resolveMediaUrl(msg.media_file_id, msg.bot_source);
            return { ...msg, media_url: mediaUrl };
          } catch (e) {
            console.error(`Failed to resolve media for message ${msg.id}:`, e);
            return msg;
          }
        }
        return msg;
      }));

      await supabase.from('customer_chats').update({ unread_count: 0 }).eq('chat_id', chatId);
      return json(res, 200, processedData);
    }

    // ---------- SEND MESSAGE ----------
    if (path === '/api/send-message' && req.method === 'POST') {
      const body = await readJson(req);
      const { chat_id, message_text } = body;
      if (!chat_id || !message_text) return json(res, 400, { error: 'Missing fields' });

      const { data: chatRow } = await supabase
        .from('customer_chats').select('bot_source').eq('chat_id', chat_id).maybeSingle();

      const botKey = chatRow?.bot_source || 'bot1';
      const token  = BOT_TOKENS[botKey];
      if (!token) return json(res, 400, { error: 'Bot token missing' });

      const tgResp = await tgApi(token, 'sendMessage', { chat_id, text: message_text });

      await supabase.from('chat_messages').insert({
        chat_id, sender: 'admin', message_text, bot_source: botKey,
      });
      await supabase.from('customer_chats').update({
        last_message: `You: ${message_text}`, updated_at: new Date().toISOString(),
      }).eq('chat_id', chat_id);

      return json(res, 200, { ok: true, telegram: tgResp });
    }

    // ---------- ADS LIST ----------
    if (path === '/api/ads' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('ads_management').select('*').order('id', { ascending: true });
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, data || []);
    }

    // ---------- WALLET SUMMARY ----------
    if (path === '/api/wallet-summary' && req.method === 'GET') {
      const { data, error } = await supabase.from('ads_management').select('ads1_fees, ads2_fees, ads3_fees, ads4_fees');
      if (error) return json(res, 500, { error: error.message });
      const total = (data || []).reduce((a, r) =>
        a + Number(r.ads1_fees || 0) + Number(r.ads2_fees || 0) + Number(r.ads3_fees || 0) + Number(r.ads4_fees || 0), 0);
      return json(res, 200, { total, count: data?.length || 0 });
    }

    // ---------- WALLET HISTORY ----------
    if (path === '/api/wallet-history' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('ads_management')
        .select('id, channel_name, ads1, ads1_fees, ads2, ads2_fees, ads3, ads3_fees, ads4, ads4_fees, updated_at')
        .order('updated_at', { ascending: false });
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, data || []);
    }

    // ---------- UPDATE CELL ----------
    if (path === '/api/update-cell' && req.method === 'POST') {
      const { id, column, value } = await readJson(req);
      if (!id || !column) return json(res, 400, { error: 'id and column required' });
      if (!ALLOWED_COLS.has(column)) return json(res, 400, { error: 'Column not allowed' });

      const patch = { [column]: value, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('ads_management').update(patch).eq('id', id).select().single();
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { ok: true, row: data });
    }

    // ---------- ADD ROW ----------
    if (path === '/api/add-row' && req.method === 'POST') {
      const { data, error } = await supabase
        .from('ads_management').insert({ channel_name: 'New Channel' }).select().single();
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, data);
    }

    // ---------- DELETE ROW ----------
    if (path.startsWith('/api/delete-row/') && req.method === 'DELETE') {
      const id = path.replace('/api/delete-row/', '');
      const { error } = await supabase.from('ads_management').delete().eq('id', id);
      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { ok: true });
    }

    // ---------- UPLOAD MEDIA ----------
    if (path.startsWith('/api/upload-media/') && req.method === 'POST') {
      const rowId = path.replace('/api/upload-media/', '');
      if (!BOT_TOKEN_1 || !TELEGRAM_CHANNEL_ID)
        return json(res, 500, { error: 'Bot token / channel id not configured' });

      const { fileBuffer, fileName } = await parseMultipart(req);
      if (!fileBuffer) return json(res, 400, { error: 'No file' });

      const tgResp = await tgSendPhoto(
        BOT_TOKEN_1, TELEGRAM_CHANNEL_ID, fileBuffer, fileName, `Asset for row #${rowId}`
      );
      if (!tgResp.ok) return json(res, 500, { error: 'Telegram upload failed', detail: tgResp });

      const photos = tgResp.result.photo || [];
      const best   = photos[photos.length - 1] || {};
      const fileId = best.file_id;
      const msgId  = tgResp.result.message_id;
      const backup = `tg://channel/${TELEGRAM_CHANNEL_ID}/${msgId}`;

      const { data, error } = await supabase.from('ads_management').update({
        telegram_file_id: fileId, media_backup_url: backup,
        updated_at: new Date().toISOString(),
      }).eq('id', rowId).select().single();

      if (error) return json(res, 500, { error: error.message });
      return json(res, 200, { ok: true, file_id: fileId, message_id: msgId, row: data });
    }

    // ---------- RESOLVE TELEGRAM FILE (LEGACY) ----------
    if (path.startsWith('/api/get-media-url/') && req.method === 'GET') {
      const fileId = decodeURIComponent(path.replace('/api/get-media-url/', ''));
      if (!BOT_TOKEN_1) return json(res, 500, { error: 'Bot token missing' });
      
      try {
        const fileUrl = await resolveMediaUrl(fileId, 'bot1');
        return json(res, 200, { ok: true, url: fileUrl });
      } catch (error) {
        return json(res, 404, { error: 'File not found', detail: error.message });
      }
    }

    // ---------- MEDIA RESOLVER (NEW) ----------
    if (path === '/api/media/resolve' && req.method === 'POST') {
      const { file_id, bot_source } = await readJson(req);
      if (!file_id) return json(res, 400, { error: 'file_id is required' });

      try {
        const botKey = bot_source || 'bot1';
        const mediaUrl = await resolveMediaUrl(file_id, botKey);
        return json(res, 200, { ok: true, file_id, media_url: mediaUrl, bot_source: botKey });
      } catch (error) {
        return json(res, 500, { error: error.message });
      }
    }

    // ---------- ADMIN AUTH ----------
    if (path === '/api/admin-auth' && req.method === 'POST') {
      const { password } = await readJson(req);
      if (password === ADMIN_PASSWORD) return json(res, 200, { ok: true });
      return json(res, 401, { ok: false });
    }

    return json(res, 404, { error: 'Not found', path });
  } catch (e) {
    console.error('Handler error:', e);
    return json(res, 500, { error: e.message });
  }
};

// Disable Vercel's default body parser for multipart uploads
module.exports.config = {
  api: { bodyParser: false },
};
