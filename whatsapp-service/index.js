const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Manually load .env since Prisma outside of Next.js needs it
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const cleanLine = line.replace(/\r$/, '').trim();
            const match = cleanLine.match(/^([^=:#]+?)[=:](.*)/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.warn("Could not load .env file manually:", e);
}

// Multi-tenant database routing
const tenantDbNames = {
    '8b52cbcd-c956-4717-a1bd-02e57386aaa2': 'neondb_officecity',
    'db5d3949-f8dd-41f6-9627-90374d55d044': 'neondb_petqro',
    'cd1e1142-ae76-46aa-b2d2-e5de02904788': 'neondb_seit',
    '0d246cea-0220-4328-92b0-8a1387ce6a6d': 'neondb_pizca'
};

const masterUrl = process.env.DATABASE_URL || 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb?sslmode=disable';

function getTenantUrl(dbName) {
    try {
        const urlObj = new URL(masterUrl);
        urlObj.pathname = `/${dbName}`;
        urlObj.searchParams.set('connection_limit', '10');
        return urlObj.toString();
    } catch (e) {
        return masterUrl;
    }
}

const masterPrisma = new PrismaClient({
    datasources: { db: { url: masterUrl } }
});
const prisma = masterPrisma; // Fallback alias

const tenantPrismaMap = new Map();

for (const [tenantId, dbName] of Object.entries(tenantDbNames)) {
    try {
        const tenantUrl = getTenantUrl(dbName);
        const tPrisma = new PrismaClient({
            datasources: { db: { url: tenantUrl } }
        });
        tenantPrismaMap.set(tenantId, tPrisma);
    } catch (e) {
        console.error(`[WHATSAPP MULTI-TENANT] Failed to initialize Prisma client for ${dbName}:`, e);
    }
}

// Return all database clients (master + all tenant DBs)
function getAllPrismaClients() {
    const list = [{ name: 'master', client: masterPrisma, tenantId: null }];
    for (const [tenantId, client] of tenantPrismaMap.entries()) {
        list.push({ name: tenantDbNames[tenantId] || tenantId, client, tenantId });
    }
    return list;
}

const branchTenantCache = new Map();

async function getPrismaForBranch(branchId) {
    if (!branchId) return { client: masterPrisma, tenantId: null, name: 'master' };
    
    if (branchTenantCache.has(branchId)) {
        return branchTenantCache.get(branchId);
    }

    const allClients = getAllPrismaClients();
    for (const item of allClients) {
        try {
            const branch = await item.client.branch.findUnique({
                where: { id: branchId },
                select: { id: true, tenantId: true }
            });
            if (branch) {
                const resolvedTenantId = branch.tenantId || item.tenantId;
                const resolvedClient = (resolvedTenantId && tenantPrismaMap.has(resolvedTenantId))
                    ? tenantPrismaMap.get(resolvedTenantId)
                    : item.client;
                const result = {
                    client: resolvedClient,
                    tenantId: resolvedTenantId,
                    name: tenantDbNames[resolvedTenantId] || item.name
                };
                branchTenantCache.set(branchId, result);
                return result;
            }
        } catch (e) {}
    }

    const fallback = { client: masterPrisma, tenantId: null, name: 'master' };
    branchTenantCache.set(branchId, fallback);
    return fallback;
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Active clients Map: branchId -> Client
const clients = new Map();

// Helper to update session across all databases
async function updateSessionInAllDbs(branchId, data) {
    const allClients = getAllPrismaClients();
    for (const { name, client } of allClients) {
        try {
            const existing = await client.whatsAppSession.findUnique({
                where: { branchId }
            });
            if (existing) {
                await client.whatsAppSession.update({
                    where: { id: existing.id },
                    data
                });
            } else {
                const branchExists = await client.branch.findUnique({
                    where: { id: branchId },
                    select: { id: true }
                });
                if (branchExists) {
                    await client.whatsAppSession.create({
                        data: {
                            branchId,
                            status: data.status || 'DISCONNECTED',
                            sessionData: data.sessionData || null
                        }
                    });
                }
            }
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update session in DB ${name} for branch ${branchId}:`, e.message);
        }
    }
}

// Helper to resolve any branchId to its tenant's primary branchId (or active connected branch in memory)
async function getPrimaryBranchId(branchId) {
    try {
        const allClients = getAllPrismaClients();
        for (const { client } of allClients) {
            try {
                const branch = await client.branch.findUnique({
                    where: { id: branchId },
                    select: { tenantId: true }
                });
                if (branch && branch.tenantId) {
                    // 1. Check if any branch belonging to this tenant is currently active in memory
                    const allTenantBranches = await client.branch.findMany({
                        where: { tenantId: branch.tenantId },
                        select: { id: true }
                    });
                    for (const b of allTenantBranches) {
                        const activeClient = clients.get(b.id);
                        if (activeClient && activeClient.info) {
                            return b.id;
                        }
                    }

                    // 2. Check if any branch has a CONNECTED session in DB
                    const connectedSession = await client.whatsAppSession.findFirst({
                        where: {
                            branch: { tenantId: branch.tenantId },
                            status: 'CONNECTED'
                        },
                        select: { branchId: true }
                    });
                    if (connectedSession && connectedSession.branchId) {
                        return connectedSession.branchId;
                    }

                    // 3. Fallback to first active branch
                    const firstBranch = await client.branch.findFirst({
                        where: { tenantId: branch.tenantId, isActive: true },
                        orderBy: { createdAt: 'asc' },
                        select: { id: true }
                    });
                    if (firstBranch) {
                        return firstBranch.id;
                    }
                }
            } catch (e) {}
        }
    } catch (e) {
        console.error(`[WHATSAPP] Error resolving primary branch for ${branchId}:`, e);
    }
    return branchId;
}

// Clean up stale Chromium lock files (including dangling symlinks) to prevent "profile in use" startup crash in Docker
function cleanupChromiumProfileLocks(sessionDir) {
    if (!fs.existsSync(sessionDir)) return;
    try {
        const cleanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const full = path.join(dir, item);
                try {
                    const stat = fs.lstatSync(full);
                    if (stat.isDirectory()) {
                        if (item === 'Default') {
                            cleanDir(full);
                        }
                    } else if (item.startsWith('Singleton') || item === 'DevToolsActivePort') {
                        fs.unlinkSync(full);
                        console.log(`[WHATSAPP] Cleaned up stale Chromium lock file: ${full}`);
                    }
                } catch (e) {
                    console.warn(`[WHATSAPP] Could not delete ${full}:`, e.message);
                }
            }
        };
        cleanDir(sessionDir);
    } catch (err) {
        console.warn(`[WHATSAPP] Failed during lock cleanup for ${sessionDir}:`, err.message);
    }
}

// Helper to normalize any phone / WhatsApp ID to a valid WhatsApp Web JID
function formatWhatsAppJid(phoneOrJid, whatsappId) {
    if (whatsappId && whatsappId !== '0' && typeof whatsappId === 'string' && whatsappId.trim()) {
        const trimmed = whatsappId.trim();
        if (trimmed.includes('@')) return trimmed;
        if (trimmed.length > 13) return `${trimmed}@lid`;
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length === 10) return `521${digits}@c.us`;
        if (digits.startsWith('52') && digits.length === 12) return `521${digits.substring(2)}@c.us`;
        if (digits.length >= 10) return `${digits}@c.us`;
    }
    if (!phoneOrJid) return null;
    const trimmedPhone = String(phoneOrJid).trim();
    if (trimmedPhone.includes('@')) return trimmedPhone;
    const digits = trimmedPhone.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) {
        // Mexican 10-digit mobile/landline -> prefix with 521 for WhatsApp Web
        return `521${digits}@c.us`;
    }
    if (digits.startsWith('52') && digits.length === 12) {
        return `521${digits.substring(2)}@c.us`;
    }
    if (digits.startsWith('521') && digits.length === 13) {
        return `${digits}@c.us`;
    }
    return `${digits}@c.us`;
}

// In-memory deduplication cache to prevent sending duplicate messages within 15 seconds
const recentSentCache = new Map(); // key: `${chatId}:::${signature}` -> { messageId, timestamp }

setInterval(() => {
    const now = Date.now();
    for (const [key, val] of recentSentCache.entries()) {
        if (now - val.timestamp > 30000) {
            recentSentCache.delete(key);
        }
    }
}, 30000);

function getMessageSignature(content, options = {}) {
    if (typeof content === 'string') {
        return content.trim();
    }
    if (content && typeof content === 'object') {
        const mime = content.mimetype || '';
        const filename = content.filename || '';
        const snippet = content.data ? content.data.substring(0, 100) : '';
        const cap = options?.caption || '';
        return `${mime}:::${filename}:::${snippet}:::${cap}`;
    }
    return '';
}

// Helper to send messages reliably with direct Puppeteer browser fallback
async function safeSendMessage(client, chatId, content, options = {}) {
    const signature = getMessageSignature(content, options);
    const cacheKey = `${chatId}:::${signature}`;
    const cached = recentSentCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < 15000)) {
        console.log(`[WHATSAPP DEDUP] Blocked duplicate send to ${chatId} within 15s window (reusing msgId: ${cached.messageId})`);
        return {
            id: { _serialized: cached.messageId },
            to: chatId,
            timestamp: Math.floor(cached.timestamp / 1000),
            isDuplicatePrevented: true
        };
    }

    // Ensure window.WWebJS.getMessageModel is safely patched to prevent
    // 'TypeError: message.serialize is not a function' in whatsapp-web.js
    if (client.pupPage) {
        try {
            await client.pupPage.evaluate(() => {
                if (window.WWebJS && !window.WWebJS._serializePatched) {
                    const origGetModel = window.WWebJS.getMessageModel;
                    window.WWebJS.getMessageModel = (message) => {
                        if (!message) return null;
                        if (typeof message.serialize === 'function') {
                            try {
                                return origGetModel(message);
                            } catch (e) {}
                        }
                        const id = message.id ? (message.id._serialized ? message.id : { _serialized: String(message.id) }) : null;
                        return {
                            id: id,
                            body: message.body || (message.caption || ''),
                            type: message.type || 'chat',
                            t: message.t || Math.floor(Date.now() / 1000),
                            from: message.from,
                            to: message.to,
                            ack: message.ack || 0,
                            fromMe: true
                        };
                    };
                    window.WWebJS._serializePatched = true;
                }
            });
        } catch (patchErr) {}
    }

    let sentMsg = null;
    try {
        sentMsg = await client.sendMessage(chatId, content, options);
        if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
            recentSentCache.set(cacheKey, {
                messageId: sentMsg.id._serialized,
                timestamp: Date.now()
            });
            return {
                id: { _serialized: sentMsg.id._serialized },
                to: sentMsg.to || chatId,
                timestamp: sentMsg.timestamp || Math.floor(Date.now() / 1000)
            };
        }
    } catch (e) {
        console.warn(`[WHATSAPP] client.sendMessage threw error (${e.message || e}). Inspecting chat before fallback...`);
    }

    // Direct Browser Native Dispatch with anti-duplicate inspection
    const textMsg = (typeof content === 'string') ? content : (options?.caption || '');
    const fallbackResult = await client.pupPage.evaluate(async (targetChatId, text) => {
        try {
            if (!window.require) {
                return { success: false, error: 'window.require is not available' };
            }

            const WidFactory = window.require('WAWebWidFactory');
            const Collections = window.require('WAWebCollections');
            const FindChatAction = window.require('WAWebFindChatAction');
            const MsgKey = window.require('WAWebMsgKey');
            const UserPrefs = window.require('WAWebUserPrefsMeUser');
            const SendMsgAction = window.require('WAWebSendMsgChatAction');
            const SendTextAction = window.require('WAWebSendTextMsgChatAction');

            const chatWid = WidFactory.createWid(targetChatId);
            if (!chatWid) return { success: false, error: 'Invalid WID: ' + targetChatId };

            let chat = Collections?.Chat ? Collections.Chat.get(chatWid) : null;
            if (!chat && Collections?.Chat?._models) {
                chat = Collections.Chat._models.find(c => c.id?._serialized === targetChatId || c.id?.user === targetChatId.split('@')[0]);
            }
            if (!chat && FindChatAction) {
                try {
                    const found = await FindChatAction.findOrCreateLatestChat(chatWid);
                    chat = found?.chat || found;
                } catch (findErr) {
                    console.error('findOrCreateLatestChat error:', findErr);
                }
            }

            if (!chat) {
                return { success: false, error: 'Chat not found for ' + targetChatId };
            }

            const nowUnix = Math.floor(Date.now() / 1000);

            // 0. Double-send check: did client.sendMessage already send this message to the chat?
            if (chat.msgs && chat.msgs._models && chat.msgs._models.length > 0) {
                const existing = chat.msgs._models.slice(-10).reverse().find(m => {
                    const isFromMe = m.id && (m.id.fromMe || m.fromMe);
                    const sameBody = (m.body === text) || (m.caption === text);
                    const isRecent = m.t && ((nowUnix - m.t) < 15);
                    return isFromMe && sameBody && isRecent;
                });
                if (existing && existing.id) {
                    const existingKey = existing.id._serialized || String(existing.id);
                    return {
                        success: true,
                        messageId: existingKey,
                        to: chat.id._serialized,
                        timestamp: existing.t || nowUnix,
                        dedupReused: true
                    };
                }
            }

            let serializedKey = null;

            // 1. If text message, prefer official SendTextAction
            if (typeof text === 'string' && text && SendTextAction?.sendTextMsgToChat) {
                try {
                    await SendTextAction.sendTextMsgToChat(chat, text);
                    if (chat.msgs && chat.msgs._models && chat.msgs._models.length > 0) {
                        const lastMsg = chat.msgs._models[chat.msgs._models.length - 1];
                        if (lastMsg && lastMsg.id) {
                            serializedKey = lastMsg.id._serialized || String(lastMsg.id);
                        }
                    }
                } catch (sendTextErr) {
                    console.error('[WHATSAPP] sendTextMsgToChat failed, falling back to addAndSendMsgToChat:', sendTextErr);
                }
            }

            // 2. Fallback to addAndSendMsgToChat
            if (!serializedKey) {
                const newId = await MsgKey.newId();
                const from = chat.id.isLid() ? UserPrefs.getMaybeMeLidUser() : UserPrefs.getMaybeMePnUser();

                const newMsgKey = new MsgKey({
                    from: from,
                    to: chat.id,
                    id: newId,
                    selfDir: 'out'
                });

                const msgPayload = {
                    id: newMsgKey,
                    ack: 0,
                    body: text || '',
                    from: from,
                    to: chat.id,
                    local: true,
                    self: 'out',
                    t: nowUnix,
                    isNewMsg: true,
                    type: 'chat'
                };

                const [msgPromise, sendMsgResultPromise] = SendMsgAction.addAndSendMsgToChat(chat, msgPayload);
                await msgPromise;
                if (sendMsgResultPromise) {
                    try {
                        await sendMsgResultPromise;
                    } catch (sendErr) {
                        console.error('[WHATSAPP] sendMsgResultPromise rejected:', sendErr);
                    }
                }

                serializedKey = (newMsgKey && newMsgKey._serialized) ? newMsgKey._serialized : (chat.id && chat.id._serialized && newId ? `true_${chat.id._serialized}_${newId}` : `WA_${nowUnix}`);
            }

            return {
                success: true,
                messageId: serializedKey,
                to: chat.id._serialized,
                timestamp: nowUnix
            };
        } catch (err) {
            return { success: false, error: err.message || String(err) };
        }
    }, chatId, textMsg);

    if (fallbackResult && fallbackResult.success) {
        recentSentCache.set(cacheKey, {
            messageId: fallbackResult.messageId,
            timestamp: Date.now()
        });
        return {
            id: { _serialized: fallbackResult.messageId },
            to: fallbackResult.to || chatId,
            timestamp: fallbackResult.timestamp || Math.floor(Date.now() / 1000)
        };
    }

    throw new Error(fallbackResult?.error || 'Failed to send message via WhatsApp client and browser fallback');
}

// In-memory cache for contact resolutions (JID -> { realPhone, whatsappId, contactName })
const contactCache = new Map();

// Helper to find or create a prospect safely handling unique constraints and race conditions
async function findOrCreateProspect(targetDb, branchId, tenantId, phoneInfo) {
    const { realPhone, whatsappId, phone, contactName, phoneVariations } = phoneInfo;
    const orConditions = phoneVariations.map(p => ({ phone: p }));
    if (whatsappId) {
        orConditions.push({ whatsappId: whatsappId });
        orConditions.push({ whatsappId: { contains: whatsappId } });
    }
    orConditions.push({ whatsappId: phone });
    orConditions.push({ whatsappId: { contains: phone } });

    let prospect = null;
    try {
        const dbBranch = await targetDb.branch.findUnique({
            where: { id: branchId },
            select: { tenantId: true }
        });
        const tId = dbBranch ? dbBranch.tenantId : tenantId;
        
        if (tId) {
            prospect = await targetDb.prospect.findFirst({
                where: {
                    branch: { tenantId: tId },
                    OR: orConditions
                }
            });
        }
    } catch (err) {}

    if (!prospect) {
        prospect = await targetDb.prospect.findFirst({
            where: { 
                branchId: branchId,
                OR: orConditions
            }
        });
    }

    if (!prospect) {
        let validBranchId = branchId;
        const branchExists = await targetDb.branch.findUnique({ where: { id: branchId }, select: { id: true } });
        if (!branchExists) {
            const fallbackBranch = await targetDb.branch.findFirst({ select: { id: true } });
            if (fallbackBranch) validBranchId = fallbackBranch.id;
        }

        try {
            prospect = await targetDb.prospect.create({
                data: {
                    name: contactName,
                    phone: realPhone,
                    whatsappId: whatsappId || phone,
                    branchId: validBranchId,
                    funnelStage: 'NEW'
                }
            });
            console.log(`[WHATSAPP] Created new prospect for phone: ${realPhone}, whatsappId: ${whatsappId || phone} under branch: ${validBranchId}`);
        } catch (createErr) {
            prospect = await targetDb.prospect.findFirst({
                where: {
                    branchId: validBranchId,
                    phone: realPhone
                }
            });
        }
    } else {
        const updates = {};
        if (whatsappId && prospect.whatsappId !== whatsappId) {
            updates.whatsappId = whatsappId;
        }
        if (realPhone && !prospect.phone) {
            updates.phone = realPhone;
        }
        if (Object.keys(updates).length > 0) {
            prospect = await targetDb.prospect.update({
                where: { id: prospect.id },
                data: updates
            }).catch(() => prospect);
        }
    }
    return prospect;
}

// Universal helper to format and extract rich content from any WhatsApp message
function extractMessageContent(m) {
    if (!m) return '';
    const type = m.type || 'chat';
    const subtype = m.subtype || '';
    
    // 1. Direct text fields
    let text = (typeof m.body === 'string' ? m.body : '') || 
               (typeof m.caption === 'string' ? m.caption : '') || 
               (typeof m.text === 'string' ? m.text : '') || 
               (typeof m.content === 'string' ? m.content : '');

    // Ignore raw debug placeholder strings if encountered
    if (text && text.startsWith('[Mensaje tipo:')) {
        text = '';
    }

    // 2. Interactive / Templates / Buttons / Lists / Catalogs
    if (type === 'interactive' || type === 'template' || m.interactivePayload || m.hydratedTemplate || m.list || m.buttons || m._data?.interactivePayload || m._data?.hydratedTemplate) {
        const parts = [];
        const headerTitle = m.interactiveHeader?.title || m.title || m._data?.title || m._data?.interactiveHeader?.title || '';
        if (headerTitle) parts.push(`*${headerTitle}*`);
        
        const bodyContent = text || m.interactivePayload?.body?.text || m.hydratedTemplate?.hydratedContentText || m._data?.body || m._data?.interactivePayload?.body?.text || m._data?.hydratedTemplate?.hydratedContentText || m.description || m._data?.description || '';
        if (bodyContent && bodyContent !== headerTitle) parts.push(bodyContent);
        
        const footer = m.interactivePayload?.footer?.text || m.footer || m._data?.footer || m._data?.interactivePayload?.footer?.text || '';
        if (footer) parts.push(`_${footer}_`);
        
        // Buttons
        const buttons = m.interactivePayload?.buttons || m.buttons || m.hydratedTemplate?.hydratedButtons || m._data?.buttons || m._data?.interactivePayload?.buttons || m._data?.hydratedTemplate?.hydratedButtons;
        if (Array.isArray(buttons) && buttons.length > 0) {
            const btnTexts = buttons.map(b => {
                const label = b.buttonText?.displayText || b.name || b.id || b.quickReplyButton?.displayText || b.urlButton?.displayText || b.callButton?.displayText || (typeof b === 'string' ? b : '');
                return label ? `[🔘 ${label}]` : '';
            }).filter(Boolean);
            if (btnTexts.length > 0) parts.push(btnTexts.join(' '));
        }
        
        // List items
        const listSections = m.list?.sections || m._data?.list?.sections;
        if (Array.isArray(listSections) && listSections.length > 0) {
            listSections.forEach(sec => {
                if (sec.title) parts.push(`📋 *${sec.title}*`);
                if (Array.isArray(sec.rows)) {
                    sec.rows.forEach(row => {
                        const rowTitle = row.title || row.id || '';
                        const rowDesc = row.description ? ` - ${row.description}` : '';
                        if (rowTitle) parts.push(`• ${rowTitle}${rowDesc}`);
                    });
                }
            });
        }
        
        if (parts.length > 0) return parts.join('\n');
    }

    // 3. Button / List responses
    if (type === 'buttons_response' || type === 'template_button_reply' || type === 'list_response') {
        const selected = m.selectedDisplayText || m.selectedButtonId || m.selectedRowId || text || m._data?.selectedDisplayText || m._data?.selectedButtonId || m._data?.selectedRowId || '';
        return `🔘 ${selected || 'Opción seleccionada'}`;
    }

    // 4. Polls
    if (type === 'poll_creation' || type === 'poll_update' || type === 'poll') {
        const pollName = m.pollName || m.pollTitle || m._data?.pollName || text || 'Encuesta';
        const options = m.pollOptions || m._data?.pollOptions;
        let pollText = `📊 *Encuesta: ${pollName}*`;
        if (Array.isArray(options) && options.length > 0) {
            const optLines = options.map(opt => `• ${opt.name || opt.optionName || opt}`);
            pollText += '\n' + optLines.join('\n');
        }
        return pollText;
    }

    // 5. Reactions
    if (type === 'reaction') {
        const emoji = m.reaction || m._data?.reactionText || text || '❤️';
        return `Reacción: ${emoji}`;
    }

    // 6. Location
    if (type === 'location' || type === 'live_location') {
        const locName = m.name || m.address || m.loc || (m.lat && m.lng ? `${m.lat},${m.lng}` : '');
        return `📍 [Ubicación]${locName ? ': ' + locName : ''}${text && text !== locName ? ' - ' + text : ''}`;
    }

    // 7. VCard / Contacts
    if (type === 'vcard' || type === 'multi_vcard') {
        const vcards = m.vCards || m.vcardList || m._data?.vcardList;
        let vcardName = '';
        if (Array.isArray(vcards) && vcards.length > 0) {
            vcardName = vcards.map(v => typeof v === 'string' ? (v.match(/FN:(.*?)\n/) || [])[1] || '' : v.displayName || v.name || '').filter(Boolean).join(', ');
        }
        return `📇 [Contacto]${vcardName ? ': ' + vcardName : ''}`;
    }

    // 8. Call Log
    if (type === 'call_log') {
        if (subtype === 'miss' || subtype === 'missed') {
            return '📞 [Llamada perdida de WhatsApp]';
        }
        if (m.isVideo) {
            return '📹 [Videollamada de WhatsApp]';
        }
        return '📞 [Llamada de WhatsApp]';
    }

    // 9. E2E Notification / Security notices
    if (type === 'e2e_notification') {
        if (subtype === 'identity_change') {
            return '🔒 Se actualizó el código de seguridad de este contacto.';
        }
        return '🔒 Los mensajes y llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos ni escucharlos.';
    }

    // 10. Notification template / Business notices
    if (type === 'notification_template' || type === 'notification') {
        if (text) return `ℹ️ ${text}`;
        if (Array.isArray(m.templateParams) && m.templateParams.length > 0) {
            return `ℹ️ ${m.templateParams.join(' ')}`;
        }
        return '🔒 Los mensajes en este chat están protegidos con cifrado de extremo a extremo.';
    }

    // 11. Ciphertext / Encrypted placeholders
    if (type === 'ciphertext' || type === 'biz_content_placeholder') {
        if (text) return text;
        return '🔒 [Mensaje cifrado de WhatsApp]';
    }

    // 12. Media types
    if (type === 'image') return '📎 [Imagen]' + (text ? ': ' + text : '');
    if (type === 'video') return '📎 [Video]' + (text ? ': ' + text : '');
    if (type === 'audio') return '📎 [Audio]' + (text ? ': ' + text : '');
    if (type === 'ptt') return '📎 [Nota de voz]' + (text ? ': ' + text : '');
    if (type === 'sticker') return '📎 [Sticker]' + (text ? ': ' + text : '');
    if (type === 'album') return '📎 [Álbum de fotos/videos]' + (text ? ': ' + text : '');
    if (type === 'document') {
        const filename = m.filename || m._data?.filename || '';
        const tag = filename ? `📎 [Documento: ${filename}]` : '📎 [Documento]';
        return tag + (text && text !== filename ? ': ' + text : '');
    }

    // 13. System / other types
    if (type === 'revoked') return '🚫 [Mensaje eliminado]';
    if (type === 'pinned_message' || type === 'pin_message') return '📌 [Mensaje fijado]' + (text ? ': ' + text : '');
    if (type === 'gp2' || type === 'group_notification') return 'ℹ️ [Notificación de grupo]' + (text ? ': ' + text : '');
    if (type === 'protocol') return 'ℹ️ [Aviso del sistema]' + (text ? ': ' + text : '');

    // If media flag is set
    if (m.hasMedia || m.isMedia) {
        return '📎 [Archivo]' + (text ? ': ' + text : '');
    }

    // Fallback
    if (text) return text;
    return '💬 [Mensaje de WhatsApp]';
}

// Helper to save a single WhatsApp message and map it to a prospect
async function saveWhatsAppMessage(branchId, client, msg, fallbackContactName = null) {
    if (msg.isStatus) return;

    // Determine JID of other party
    const otherPartyJid = msg.fromMe ? msg.to : msg.from;
    if (!otherPartyJid || (!otherPartyJid.endsWith('@c.us') && !otherPartyJid.endsWith('@lid'))) return; // ignore groups, broadcast, status

    const phone = otherPartyJid.split('@')[0];

    // Fetch contact and normalize phone numbers
    let realPhone = phone;
    let whatsappId = null;
    let contactName = fallbackContactName || phone;

    if (contactCache.has(otherPartyJid)) {
        const cached = contactCache.get(otherPartyJid);
        realPhone = cached.realPhone || phone;
        whatsappId = cached.whatsappId;
        contactName = cached.contactName || contactName;
    } else {
        try {
            // Fetch contact with a 1-second timeout to avoid hanging
            const contact = await Promise.race([
                client.getContactById(otherPartyJid),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout resolving contact')), 1000))
            ]);
            
            contactName = contact.pushname || contact.name || fallbackContactName || phone;
            
            // Retrieve standard JID from contact.id if available
            if (contact.id && contact.id._serialized) {
                if (contact.id._serialized.endsWith('@c.us') || contact.id._serialized.endsWith('@lid')) {
                    realPhone = contact.id.user;
                }
            }
            
            if (otherPartyJid.endsWith('@lid')) {
                whatsappId = phone; // LID JID user
            } else {
                whatsappId = realPhone;
            }

            contactCache.set(otherPartyJid, { realPhone, whatsappId, contactName });
        } catch (contactErr) {
            if (otherPartyJid.endsWith('@lid')) {
                whatsappId = phone;
            } else {
                whatsappId = realPhone;
            }
            contactCache.set(otherPartyJid, { realPhone, whatsappId, contactName });
        }
    }

    // Build Mexican phone number variations to search
    const phoneVariations = [realPhone];
    let basePhone = realPhone;
    if (realPhone.startsWith('521') && realPhone.length === 13) {
        basePhone = realPhone.substring(3);
        phoneVariations.push('52' + basePhone);
        phoneVariations.push(basePhone);
    } else if (realPhone.startsWith('52') && realPhone.length === 12) {
        basePhone = realPhone.substring(2);
        phoneVariations.push('521' + basePhone);
        phoneVariations.push(basePhone);
    } else if (realPhone.length === 10) {
        phoneVariations.push('52' + realPhone);
        phoneVariations.push('521' + realPhone);
    }

    if (!phoneVariations.includes(phone)) {
        phoneVariations.push(phone);
    }

    const phoneInfo = { realPhone, whatsappId, phone, contactName, phoneVariations };

    // Set initial status based on ACK
    let initialStatus = 0;
    if (msg.fromMe) {
        if (msg.ack === 1) initialStatus = 1;
        else if (msg.ack === 2) initialStatus = 2;
        else if (msg.ack >= 3) initialStatus = 3;
        else initialStatus = 1; // default to sent
    }

    const bodyText = extractMessageContent(msg);

    // Determine target DB clients to save to:
    const { client: branchDbClient, tenantId } = await getPrismaForBranch(branchId);
    
    // Save to branchDbClient and masterPrisma
    const targetClients = [branchDbClient];
    if (branchDbClient !== masterPrisma) {
        targetClients.push(masterPrisma);
    }

    for (const targetDb of targetClients) {
        try {
            // Avoid duplicates
            const existingMsg = await targetDb.whatsAppMessage.findFirst({
                where: { messageId: msg.id._serialized }
            });
            if (existingMsg) {
                continue;
            }

            const prospect = await findOrCreateProspect(targetDb, branchId, tenantId, phoneInfo);
            if (!prospect) continue;

            // If fromMe, see if there is a pending message we can link to
            let linkedPending = false;
            if (msg.fromMe) {
                // Strict DB dedup: check if an outgoing message with the same body already exists within 15 seconds
                const recentDuplicate = await targetDb.whatsAppMessage.findFirst({
                    where: {
                        prospectId: prospect.id,
                        body: bodyText,
                        isFromMe: true,
                        createdAt: {
                            gte: new Date(Date.now() - 15000)
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (recentDuplicate) {
                    if (!recentDuplicate.messageId || recentDuplicate.messageId.startsWith('WA_')) {
                        await targetDb.whatsAppMessage.update({
                            where: { id: recentDuplicate.id },
                            data: {
                                messageId: msg.id._serialized,
                                status: initialStatus,
                                timestamp: new Date(msg.timestamp * 1000)
                            }
                        }).catch(() => {});
                        console.log(`[WHATSAPP] saveWhatsAppMessage: Linked incoming WhatsApp ID ${msg.id._serialized} to existing pending row ${recentDuplicate.id}`);
                    } else {
                        console.log(`[WHATSAPP] saveWhatsAppMessage: Suppressed duplicate outgoing message for prospect ${prospect.id} in DB (already saved as ${recentDuplicate.messageId})`);
                    }
                    linkedPending = true;
                }

                if (!linkedPending) {
                    const pendingMsg = await targetDb.whatsAppMessage.findFirst({
                        where: {
                            prospectId: prospect.id,
                            messageId: null,
                            isFromMe: true
                        },
                        orderBy: {
                            timestamp: 'asc'
                        }
                    });

                    if (pendingMsg) {
                        await targetDb.whatsAppMessage.update({
                            where: { id: pendingMsg.id },
                            data: {
                                messageId: msg.id._serialized,
                                body: bodyText,
                                status: initialStatus,
                                timestamp: new Date(msg.timestamp * 1000)
                            }
                        }).catch(() => {});
                        linkedPending = true;
                    }
                }
            }

            if (!linkedPending) {
                await targetDb.whatsAppMessage.create({
                    data: {
                        messageId: msg.id._serialized,
                        prospectId: prospect.id,
                        body: bodyText,
                        isFromMe: msg.fromMe,
                        status: initialStatus,
                        timestamp: new Date(msg.timestamp * 1000)
                    }
                }).catch(() => {});
            }

            // Actualizar updatedAt del prospecto para empujar la conversación arriba al instante
            await targetDb.prospect.update({
                where: { id: prospect.id },
                data: { updatedAt: new Date() }
            }).catch(() => {});
        } catch (dbErr) {
            console.error(`[WHATSAPP] Error saving message event for branch ${branchId}:`, dbErr.message);
        }
    }

    // If message contains media, download and store full resolution file in background immediately
    if (msg.hasMedia || ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(msg.type)) {
        (async () => {
            try {
                const media = await downloadMediaForMessage(client, msg.id._serialized, otherPartyJid);
                if (media && media.data) {
                    const mime = media.mimetype || (msg.type === 'document' ? 'application/pdf' : 'image/jpeg');
                    const fname = media.filename || msg.filename || (mime.includes('pdf') ? 'documento.pdf' : 'archivo');
                    for (const targetDb of targetClients) {
                        try {
                            await targetDb.whatsAppMediaRequest.upsert({
                                where: { messageId: msg.id._serialized },
                                create: {
                                    messageId: msg.id._serialized,
                                    status: 'COMPLETED',
                                    mimetype: mime,
                                    filename: fname,
                                    data: media.data
                                },
                                update: {
                                    status: 'COMPLETED',
                                    mimetype: mime,
                                    filename: fname,
                                    data: media.data
                                }
                            });
                        } catch (e) {}
                    }
                }
            } catch (e) {}
        })();
    }
}

// Helper to attach native Puppeteer WhatsApp event listeners for real-time messages and ACKs
async function attachNativeWhatsAppListeners(branchId, client) {
    if (!client || !client.pupPage) return;
    try {
        // Expose function for incoming / outgoing message events
        try {
            await client.pupPage.exposeFunction('onNativeWhatsAppMessage', async (rawMsg) => {
                try {
                    await saveWhatsAppMessage(branchId, client, rawMsg);
                } catch (e) {
                    console.error('[WHATSAPP NATIVE MSG SAVE ERR]:', e.message);
                }
            });
        } catch (exposeErr) {}

        try {
            await client.pupPage.exposeFunction('onNativeWhatsAppAck', async (messageId, ack) => {
                try {
                    let status = 0;
                    if (ack === 1) status = 1;
                    else if (ack === 2) status = 2;
                    else if (ack >= 3) status = 3;

                    const allClients = getAllPrismaClients();
                    for (const { client: dbClient } of allClients) {
                        await dbClient.whatsAppMessage.updateMany({
                            where: { messageId: messageId },
                            data: { status }
                        }).catch(() => {});
                    }
                } catch (e) {}
            });
        } catch (exposeAckErr) {}

        // Inject event listeners into WhatsApp Web
        await client.pupPage.evaluate(() => {
            function extractBrowserMessageContent(m) {
                if (!m) return '';
                const type = m.type || 'chat';
                const subtype = m.subtype || '';
                let text = (typeof m.body === 'string' ? m.body : '') || 
                           (typeof m.caption === 'string' ? m.caption : '') || 
                           (typeof m.text === 'string' ? m.text : '') || 
                           (typeof m.content === 'string' ? m.content : '');

                if (type === 'interactive' || type === 'template' || m.interactivePayload || m.hydratedTemplate || m.list || m.buttons) {
                    const parts = [];
                    const headerTitle = m.interactiveHeader?.title || m.title || '';
                    if (headerTitle) parts.push(`*${headerTitle}*`);
                    const bodyContent = text || m.interactivePayload?.body?.text || m.hydratedTemplate?.hydratedContentText || m.description || '';
                    if (bodyContent && bodyContent !== headerTitle) parts.push(bodyContent);
                    const footer = m.interactivePayload?.footer?.text || m.footer || '';
                    if (footer) parts.push(`_${footer}_`);
                    const buttons = m.interactivePayload?.buttons || m.buttons || m.hydratedTemplate?.hydratedButtons;
                    if (Array.isArray(buttons) && buttons.length > 0) {
                        const btnTexts = buttons.map(b => {
                            const label = b.buttonText?.displayText || b.name || b.id || b.quickReplyButton?.displayText || b.urlButton?.displayText || (typeof b === 'string' ? b : '');
                            return label ? `[🔘 ${label}]` : '';
                        }).filter(Boolean);
                        if (btnTexts.length > 0) parts.push(btnTexts.join(' '));
                    }
                    if (parts.length > 0) return parts.join('\n');
                }

                if (type === 'buttons_response' || type === 'template_button_reply' || type === 'list_response') {
                    const selected = m.selectedDisplayText || m.selectedButtonId || m.selectedRowId || text || '';
                    return `🔘 ${selected || 'Opción seleccionada'}`;
                }

                if (type === 'poll_creation' || type === 'poll_update' || type === 'poll') {
                    const pollName = m.pollName || m.pollTitle || text || 'Encuesta';
                    const options = m.pollOptions;
                    let pollText = `📊 *Encuesta: ${pollName}*`;
                    if (Array.isArray(options) && options.length > 0) {
                        const optLines = options.map(opt => `• ${opt.name || opt.optionName || opt}`);
                        pollText += '\n' + optLines.join('\n');
                    }
                    return pollText;
                }

                if (type === 'reaction') {
                    const emoji = m.reaction || text || '❤️';
                    return `Reacción: ${emoji}`;
                }

                if (type === 'location' || type === 'live_location') {
                    const locName = m.name || m.address || m.loc || (m.lat && m.lng ? `${m.lat},${m.lng}` : '');
                    return `📍 [Ubicación]${locName ? ': ' + locName : ''}${text && text !== locName ? ' - ' + text : ''}`;
                }

                if (type === 'call_log') {
                    return (subtype === 'miss' || subtype === 'missed') ? '📞 [Llamada perdida de WhatsApp]' : '📞 [Llamada de WhatsApp]';
                }

                if (type === 'e2e_notification') {
                    return (subtype === 'identity_change') 
                        ? '🔒 Se actualizó el código de seguridad de este contacto.'
                        : '🔒 Los mensajes y llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos ni escucharlos.';
                }

                if (type === 'notification_template' || type === 'notification') {
                    if (text) return `ℹ️ ${text}`;
                    return '🔒 Los mensajes en este chat están protegidos con cifrado de extremo a extremo.';
                }

                if (type === 'ciphertext' || type === 'biz_content_placeholder') {
                    return text || '🔒 [Mensaje cifrado de WhatsApp]';
                }

                if (type === 'image') return '📎 [Imagen]' + (text ? ': ' + text : '');
                if (type === 'video') return '📎 [Video]' + (text ? ': ' + text : '');
                if (type === 'audio') return '📎 [Audio]' + (text ? ': ' + text : '');
                if (type === 'ptt') return '📎 [Nota de voz]' + (text ? ': ' + text : '');
                if (type === 'sticker') return '📎 [Sticker]' + (text ? ': ' + text : '');
                if (type === 'album') return '📎 [Álbum de fotos/videos]' + (text ? ': ' + text : '');
                if (type === 'document') {
                    const filename = m.filename || '';
                    return (filename ? `📎 [Documento: ${filename}]` : '📎 [Documento]') + (text && text !== filename ? ': ' + text : '');
                }

                if (type === 'revoked') return '🚫 [Mensaje eliminado]';
                if (type === 'pinned_message' || type === 'pin_message') return '📌 [Mensaje fijado]' + (text ? ': ' + text : '');
                if (m.hasMedia || m.isMedia) return '📎 [Archivo]' + (text ? ': ' + text : '');
                return text || '💬 [Mensaje de WhatsApp]';
            }

            function setupListeners() {
                if (!window.require) return false;
                try {
                    const collections = window.require('WAWebCollections');
                    if (!collections || !collections.Msg) return false;

                    if (window.__caanma_listeners_attached) return true;

                    collections.Msg.on('add', (m) => {
                        try {
                            if (!m) return;
                            const fromMe = Boolean(m.id?.fromMe ?? m.fromMe);
                            const toJid = m.to?._serialized || (typeof m.to === 'string' ? m.to : '');
                            const fromJid = m.from?._serialized || (typeof m.from === 'string' ? m.from : '');

                            const payload = {
                                id: { _serialized: m.id?._serialized || String(m.id) },
                                body: extractBrowserMessageContent(m),
                                type: m.type || 'chat',
                                subtype: m.subtype || '',
                                timestamp: m.t || Math.floor(Date.now() / 1000),
                                fromMe: fromMe,
                                from: fromJid,
                                to: toJid,
                                hasMedia: Boolean(m.isMedia || m.mimetype || m.mediaKey || m.type === 'image' || m.type === 'video' || m.type === 'audio' || m.type === 'ptt' || m.type === 'document' || m.type === 'sticker'),
                                ack: m.ack || 0,
                                isStatus: Boolean(m.isStatus || (m.id && m.id.remote === 'status@broadcast'))
                            };

                            if (window.onNativeWhatsAppMessage) {
                                window.onNativeWhatsAppMessage(payload);
                            }
                        } catch (err) {
                            console.error('[CAANMA] Error in Msg add listener:', err);
                        }
                    });

                    collections.Msg.on('change:ack', (m, ack) => {
                        try {
                            const msgId = m?.id?._serialized || String(m?.id);
                            const ackVal = ack || m?.ack || 0;
                            if (window.onNativeWhatsAppAck && msgId) {
                                window.onNativeWhatsAppAck(msgId, ackVal);
                            }
                        } catch (e) {}
                    });

                    window.__caanma_listeners_attached = true;
                    console.log('[CAANMA] Native message and ACK listeners successfully hooked into WAWebCollections.Msg!');
                    return true;
                } catch (e) {
                    return false;
                }
            }

            if (!setupListeners()) {
                const intervalId = setInterval(() => {
                    if (setupListeners()) clearInterval(intervalId);
                }, 1000);
            }
        });
        console.log(`[WHATSAPP] Native event listeners attached for branch ${branchId}`);
    } catch (err) {
        console.error(`[WHATSAPP] Failed to attach native listeners for branch ${branchId}:`, err.message);
    }
}

// Function to sync recent chats and their history to the database using WhatsApp Web native collections
async function syncRecentChatsHistory(branchId, client) {
    console.log(`[WHATSAPP] [Branch: ${branchId}] Starting Phase 1 Chats History Sync...`);
    try {
        await attachNativeWhatsAppListeners(branchId, client);

        const rawChatsData = await client.pupPage.evaluate(() => {
            try {
                function extractBrowserMessageContent(m) {
                    if (!m) return '';
                    const type = m.type || 'chat';
                    const subtype = m.subtype || '';
                    let text = (typeof m.body === 'string' ? m.body : '') || 
                               (typeof m.caption === 'string' ? m.caption : '') || 
                               (typeof m.text === 'string' ? m.text : '') || 
                               (typeof m.content === 'string' ? m.content : '');

                    if (type === 'interactive' || type === 'template' || m.interactivePayload || m.hydratedTemplate || m.list || m.buttons) {
                        const parts = [];
                        const headerTitle = m.interactiveHeader?.title || m.title || '';
                        if (headerTitle) parts.push(`*${headerTitle}*`);
                        const bodyContent = text || m.interactivePayload?.body?.text || m.hydratedTemplate?.hydratedContentText || m.description || '';
                        if (bodyContent && bodyContent !== headerTitle) parts.push(bodyContent);
                        const footer = m.interactivePayload?.footer?.text || m.footer || '';
                        if (footer) parts.push(`_${footer}_`);
                        const buttons = m.interactivePayload?.buttons || m.buttons || m.hydratedTemplate?.hydratedButtons;
                        if (Array.isArray(buttons) && buttons.length > 0) {
                            const btnTexts = buttons.map(b => {
                                const label = b.buttonText?.displayText || b.name || b.id || b.quickReplyButton?.displayText || b.urlButton?.displayText || (typeof b === 'string' ? b : '');
                                return label ? `[🔘 ${label}]` : '';
                            }).filter(Boolean);
                            if (btnTexts.length > 0) parts.push(btnTexts.join(' '));
                        }
                        if (parts.length > 0) return parts.join('\n');
                    }

                    if (type === 'buttons_response' || type === 'template_button_reply' || type === 'list_response') {
                        const selected = m.selectedDisplayText || m.selectedButtonId || m.selectedRowId || text || '';
                        return `🔘 ${selected || 'Opción seleccionada'}`;
                    }

                    if (type === 'poll_creation' || type === 'poll_update' || type === 'poll') {
                        const pollName = m.pollName || m.pollTitle || text || 'Encuesta';
                        const options = m.pollOptions;
                        let pollText = `📊 *Encuesta: ${pollName}*`;
                        if (Array.isArray(options) && options.length > 0) {
                            const optLines = options.map(opt => `• ${opt.name || opt.optionName || opt}`);
                            pollText += '\n' + optLines.join('\n');
                        }
                        return pollText;
                    }

                    if (type === 'reaction') {
                        const emoji = m.reaction || text || '❤️';
                        return `Reacción: ${emoji}`;
                    }

                    if (type === 'location' || type === 'live_location') {
                        const locName = m.name || m.address || m.loc || (m.lat && m.lng ? `${m.lat},${m.lng}` : '');
                        return `📍 [Ubicación]${locName ? ': ' + locName : ''}${text && text !== locName ? ' - ' + text : ''}`;
                    }

                    if (type === 'call_log') {
                        return (subtype === 'miss' || subtype === 'missed') ? '📞 [Llamada perdida de WhatsApp]' : '📞 [Llamada de WhatsApp]';
                    }

                    if (type === 'e2e_notification') {
                        return (subtype === 'identity_change') 
                            ? '🔒 Se actualizó el código de seguridad de este contacto.'
                            : '🔒 Los mensajes y llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos ni escucharlos.';
                    }

                    if (type === 'notification_template' || type === 'notification') {
                        if (text) return `ℹ️ ${text}`;
                        return '🔒 Los mensajes en este chat están protegidos con cifrado de extremo a extremo.';
                    }

                    if (type === 'ciphertext' || type === 'biz_content_placeholder') {
                        return text || '🔒 [Mensaje cifrado de WhatsApp]';
                    }

                    if (type === 'image') return '📎 [Imagen]' + (text ? ': ' + text : '');
                    if (type === 'video') return '📎 [Video]' + (text ? ': ' + text : '');
                    if (type === 'audio') return '📎 [Audio]' + (text ? ': ' + text : '');
                    if (type === 'ptt') return '📎 [Nota de voz]' + (text ? ': ' + text : '');
                    if (type === 'sticker') return '📎 [Sticker]' + (text ? ': ' + text : '');
                    if (type === 'album') return '📎 [Álbum de fotos/videos]' + (text ? ': ' + text : '');
                    if (type === 'document') {
                        const filename = m.filename || '';
                        return (filename ? `📎 [Documento: ${filename}]` : '📎 [Documento]') + (text && text !== filename ? ': ' + text : '');
                    }

                    if (type === 'revoked') return '🚫 [Mensaje eliminado]';
                    if (type === 'pinned_message' || type === 'pin_message') return '📌 [Mensaje fijado]' + (text ? ': ' + text : '');
                    if (m.hasMedia || m.isMedia) return '📎 [Archivo]' + (text ? ': ' + text : '');
                    return text || '💬 [Mensaje de WhatsApp]';
                }

                const req = window.require;
                if (!req) return [];
                const collections = req('WAWebCollections');
                if (!collections || !collections.Chat) return [];

                let chatList = (collections.Chat._models || []).slice();
                // Sort chats by most recent activity timestamp descending
                chatList.sort((a, b) => (b.t || 0) - (a.t || 0));

                const result = [];

                for (const c of chatList) {
                    const jid = c.id?._serialized || '';
                    if (!jid || c.isGroup || c.isReadOnly || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) {
                        continue;
                    }

                    const msgs = (c.msgs && c.msgs._models) ? c.msgs._models.slice(-50) : [];
                    const mappedMsgs = msgs.map(m => ({
                        id: { _serialized: m.id?._serialized || String(m.id) },
                        body: extractBrowserMessageContent(m),
                        type: m.type || 'chat',
                        subtype: m.subtype || '',
                        timestamp: m.t || Math.floor(Date.now() / 1000),
                        fromMe: Boolean(m.id?.fromMe ?? m.fromMe),
                        from: m.from?._serialized || m.from || '',
                        to: m.to?._serialized || m.to || '',
                        hasMedia: Boolean(m.isMedia || m.mimetype || m.mediaKey || m.type === 'image' || m.type === 'video' || m.type === 'audio' || m.type === 'ptt' || m.type === 'document' || m.type === 'sticker'),
                        ack: m.ack || 0,
                        isStatus: Boolean(m.isStatus)
                    }));

                    result.push({
                        jid: jid,
                        name: c.name || c.formattedTitle || jid.split('@')[0],
                        unreadCount: c.unreadCount || 0,
                        messages: mappedMsgs
                    });
                }

                return result;
            } catch (err) {
                console.error('Error extracting chats in sync:', err);
                return [];
            }
        });

        console.log(`[WHATSAPP] [Branch: ${branchId}] Found ${rawChatsData.length} direct chats on device. Syncing to DB...`);

        const { client: branchDbClient, tenantId } = await getPrismaForBranch(branchId);
        const targetClients = [branchDbClient];
        if (branchDbClient !== masterPrisma) {
            targetClients.push(masterPrisma);
        }

        let savedCount = 0;
        for (const chatItem of rawChatsData) {
            const jid = chatItem.jid;
            const phone = jid.split('@')[0];
            let realPhone = phone;
            let whatsappId = jid.endsWith('@lid') ? phone : realPhone;
            let contactName = chatItem.name || phone;

            if (contactCache.has(jid)) {
                const cached = contactCache.get(jid);
                realPhone = cached.realPhone || phone;
                whatsappId = cached.whatsappId;
                contactName = cached.contactName || contactName;
            } else {
                contactCache.set(jid, { realPhone, whatsappId, contactName });
            }

            const phoneVariations = [realPhone];
            let basePhone = realPhone;
            if (realPhone.startsWith('521') && realPhone.length === 13) {
                basePhone = realPhone.substring(3);
                phoneVariations.push('52' + basePhone);
                phoneVariations.push(basePhone);
            } else if (realPhone.startsWith('52') && realPhone.length === 12) {
                basePhone = realPhone.substring(2);
                phoneVariations.push('521' + basePhone);
                phoneVariations.push(basePhone);
            } else if (realPhone.length === 10) {
                phoneVariations.push('52' + realPhone);
                phoneVariations.push('521' + realPhone);
            }
            if (!phoneVariations.includes(phone)) {
                phoneVariations.push(phone);
            }

            const phoneInfo = { realPhone, whatsappId, phone, contactName, phoneVariations };

            for (const targetDb of targetClients) {
                try {
                    const prospect = await findOrCreateProspect(targetDb, branchId, tenantId, phoneInfo);
                    if (!prospect) continue;

                    for (const msg of chatItem.messages) {
                        try {
                            const existingMsg = await targetDb.whatsAppMessage.findFirst({
                                where: { messageId: msg.id._serialized }
                            });
                            if (existingMsg) continue;

                            let initialStatus = 0;
                            if (msg.fromMe) {
                                if (msg.ack === 1) initialStatus = 1;
                                else if (msg.ack === 2) initialStatus = 2;
                                else if (msg.ack >= 3) initialStatus = 3;
                                else initialStatus = 1;
                            }

                            const bodyText = extractMessageContent(msg);

                            await targetDb.whatsAppMessage.create({
                                data: {
                                    messageId: msg.id._serialized,
                                    prospectId: prospect.id,
                                    body: bodyText,
                                    isFromMe: msg.fromMe,
                                    status: initialStatus,
                                    timestamp: new Date(msg.timestamp * 1000)
                                }
                            }).catch(() => {});
                            savedCount++;
                        } catch (e) {}
                    }

                    await targetDb.prospect.update({
                        where: { id: prospect.id },
                        data: { updatedAt: new Date() }
                    }).catch(() => {});
                } catch (dbErr) {
                    console.error(`[WHATSAPP] Error in batch chat sync for ${jid}:`, dbErr.message);
                }
            }
        }

        console.log(`[WHATSAPP] [Branch: ${branchId}] Successfully completed history sync (${savedCount} messages synced across ${rawChatsData.length} chats).`);
    } catch (e) {
        console.error(`[WHATSAPP] [Branch: ${branchId}] History sync failed:`, e.message);
    }
}

// Helper to get or create a WhatsApp session by branchId across databases
async function getSessionForBranch(originalBranchId) {
    const branchId = await getPrimaryBranchId(originalBranchId);
    const allClients = getAllPrismaClients();
    let mainSession = null;
    for (const { client } of allClients) {
        try {
            let session = await client.whatsAppSession.findUnique({
                where: { branchId }
            });
            if (!session) {
                session = await client.whatsAppSession.create({
                    data: {
                        branchId,
                        status: 'DISCONNECTED'
                    }
                });
            }
            if (!mainSession) mainSession = session;
        } catch (e) {}
    }
    return mainSession || { branchId, status: 'DISCONNECTED' };
}

// Function to initialize or get a client for a specific branch
async function getClientForBranch(originalBranchId, forceRecreate = false) {
    const branchId = await getPrimaryBranchId(originalBranchId);
    
    if (clients.has(branchId) && !forceRecreate) {
        return clients.get(branchId);
    }

    console.log(`[WHATSAPP] Initializing a new WhatsApp Client for branch: ${branchId} (Original request: ${originalBranchId})...`);
    
    // Clean old client if forcing recreate
    if (clients.has(branchId)) {
        try {
            const oldClient = clients.get(branchId);
            await oldClient.destroy();
        } catch (e) {
            console.warn(`[WHATSAPP] Error destroying old client for branch ${branchId}:`, e.message);
        }
        clients.delete(branchId);
    }

    const shortBranchId = branchId.split('-')[0];

    // Clean up stale Chromium lock files (and broken symlinks) to prevent "profile in use" startup crash in Docker
    const sessionDir = path.join(process.cwd(), '.wwebjs_auth', `session-br-${shortBranchId}`);
    cleanupChromiumProfileLocks(sessionDir);

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: `br-${shortBranchId}`,
            dataPath: './.wwebjs_auth'
        }),
        authTimeoutMs: 120000,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 60000,
        puppeteer: {
            launcher: puppeteer,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions'
            ],
            headless: true,
            timeout: 120000,
        }
    });

    clients.set(branchId, client);

    client.on('qr', async (qr) => {
        console.log(`[WHATSAPP] QR RECEIVED for branch ${branchId}`, qr);
        qrcode.generate(qr, { small: true });
        
        try {
            await updateSessionInAllDbs(branchId, {
                status: 'QR_READY',
                sessionData: qr
            });
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update QR in DB for branch ${branchId}`, e);
        }
    });

    client.on('ready', async () => {
        console.log(`[WHATSAPP] Client is ready for branch ${branchId}!`);
        try {
            const phone = client.info && client.info.wid ? client.info.wid.user : null;
            await updateSessionInAllDbs(branchId, {
                status: 'CONNECTED',
                sessionData: phone ? JSON.stringify({ phone }) : null
            });

            // Auto-retry any failed messages across databases
            try {
                const { client: branchDb } = await getPrismaForBranch(branchId);
                const targetDbs = [branchDb];
                if (branchDb !== masterPrisma) targetDbs.push(masterPrisma);
                for (const tDb of targetDbs) {
                    await tDb.whatsAppMessage.updateMany({
                        where: {
                            isFromMe: true,
                            messageId: { startsWith: 'FAILED_' }
                        },
                        data: {
                            messageId: null
                        }
                    }).catch(() => {});
                }
            } catch (retryErr) {}

            // Run self-healing for LID contacts in the background
            selfHealLIDProspects(branchId).catch(err => {
                console.error(`[WHATSAPP] Background self-healing failed for branch ${branchId}:`, err);
            });

            // Sync recent chats history in the background when ready (delayed by 5s to avoid decryption timing errors)
            setTimeout(() => {
                syncRecentChatsHistory(branchId, client).catch(err => {
                    console.error(`[WHATSAPP] Background history sync failed for branch ${branchId}:`, err);
                });
            }, 5000);
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update Ready status in DB for branch ${branchId}`, e);
        }
    });

    client.on('auth_failure', async (msg) => {
        console.error(`[WHATSAPP] Authentication failure for branch ${branchId}:`, msg);
        clients.delete(branchId);
        
        try {
            await client.destroy();
        } catch (e) {}

        // Clean folder ONLY when auth has actually failed (e.g. unlinked from phone)
        const shortBranchId = branchId.split('-')[0];
        const authPath = path.resolve(process.cwd(), `./.wwebjs_auth/session-br-${shortBranchId}`);
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log(`[WHATSAPP] Cleaned up invalidated credentials folder for branch ${branchId} after auth_failure.`);
            } catch (fsErr) {
                console.error(`[WHATSAPP] Failed to clean credentials folder:`, fsErr);
            }
        }

        try {
            await updateSessionInAllDbs(branchId, {
                status: 'DISCONNECTED',
                sessionData: null
            });
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update auth_failure in DB for branch ${branchId}`, e);
        }
    });

    client.on('disconnected', async (reason) => {
        console.log(`[WHATSAPP] Client was disconnected for branch ${branchId}. Reason:`, reason);
        clients.delete(branchId);

        const isExplicitLogout = reason === 'LOGOUT' || reason === 'UNPAIRED';

        if (isExplicitLogout) {
            const shortBranchId = branchId.split('-')[0];
            const authPath = path.resolve(process.cwd(), `./.wwebjs_auth/session-br-${shortBranchId}`);
            if (fs.existsSync(authPath)) {
                try {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log(`[WHATSAPP] Removed auth folder on explicit logout for branch ${branchId}`);
                } catch (e) {}
            }
            try {
                await updateSessionInAllDbs(branchId, {
                    status: 'DISCONNECTED',
                    sessionData: null
                });
            } catch (e) {}
        } else {
            console.log(`[WHATSAPP] Non-logout disconnect (${reason}). Retaining session credentials and scheduling auto-reconnect in 5s for branch ${branchId}...`);
            setTimeout(async () => {
                try {
                    if (!clients.has(branchId)) {
                        console.log(`[WHATSAPP] Executing auto-reconnect for branch ${branchId}...`);
                        await getClientForBranch(branchId, false);
                    }
                } catch (recErr) {
                    console.error(`[WHATSAPP] Auto-reconnect attempt failed for branch ${branchId}:`, recErr.message);
                }
            }, 5000);
        }
    });

    const handleIncomingOrCreateMessage = async msg => {
        await saveWhatsAppMessage(branchId, client, msg);
    };

    // Listen to message_create which covers both incoming and outgoing messages
    client.on('message_create', handleIncomingOrCreateMessage);

    client.on('message_ack', async (msg, ack) => {
        try {
            if (!msg.id._serialized) return;
            
            let status = 0;
            if (ack === 1) status = 1; // sent to server (1 palomita)
            else if (ack === 2) status = 2; // delivered to device (2 palomitas grises)
            else if (ack === 3 || ack === 4 || ack === 5) status = 3; // read/played (2 palomitas azules)
            
            const allClients = getAllPrismaClients();
            for (const { client: dbClient } of allClients) {
                try {
                    await dbClient.whatsAppMessage.updateMany({
                        where: { messageId: msg.id._serialized },
                        data: { status }
                    });
                } catch (e) {}
            }
            console.log(`[WHATSAPP] Updated message ACK for ${msg.id._serialized} to status ${status}`);
        } catch (e) {
            console.error('Error updating message ack:', e);
        }
    });

    client.initialize().catch(async err => {
        console.error(`[WHATSAPP] Initialization crash for branch ${branchId}:`, err.message || err);
        
        clients.delete(branchId);
        
        try {
            await client.destroy();
            console.log(`[WHATSAPP] Closed browser instance for branch ${branchId} after initialization crash.`);
        } catch (destroyErr) {
            console.warn(`[WHATSAPP] Failed to destroy client browser for branch ${branchId}:`, destroyErr.message);
        }

        // NOTE: We do NOT delete .wwebjs_auth directory here!
        // Transient timeouts or startup delays must not delete the session.
        // The background polling will resume it safely.
    });

    return client;
}

app.post('/api/send', async (req, res) => {
    const { phone, message, prospectId, media, branchId, pendingMessageId, tenantId } = req.body;
    
    if (!phone && !prospectId) {
        return res.status(400).json({ error: 'Phone or prospectId is required' });
    }

    try {
        let resolvedBranchId = branchId;
        let foundProspect = null;
        let prospectDbClient = masterPrisma;

        const allDbs = getAllPrismaClients();
        const prioritizedDbs = [...allDbs].sort((a, b) => {
            if (tenantId && a.tenantId === tenantId) return -1;
            if (tenantId && b.tenantId === tenantId) return 1;
            if (a.name === 'master') return 1;
            if (b.name === 'master') return -1;
            return 0;
        });

        if (prospectId) {
            for (const { client: dbClient } of prioritizedDbs) {
                try {
                    const pr = await dbClient.prospect.findUnique({
                        where: { id: prospectId }
                    });
                    if (pr) {
                        foundProspect = pr;
                        prospectDbClient = dbClient;
                        if (!resolvedBranchId) resolvedBranchId = pr.branchId;
                        break;
                    }
                } catch (e) {}
            }
        }

        if (!resolvedBranchId) {
            return res.status(400).json({ error: 'Could not resolve branchId' });
        }

        resolvedBranchId = await getPrimaryBranchId(resolvedBranchId);

        let client = clients.get(resolvedBranchId);
        if (!client || !client.info) {
            // Sibling tenant fallback: check if there's another branch in this tenant that is CONNECTED
            try {
                const { client: dbClient, tenantId } = await getPrismaForBranch(resolvedBranchId);
                if (tenantId) {
                    const siblingBranches = await dbClient.branch.findMany({
                        where: { tenantId: tenantId, isActive: true },
                        select: { id: true }
                    });
                    for (const sibling of siblingBranches) {
                        const altClient = clients.get(sibling.id);
                        if (altClient && altClient.info) {
                            client = altClient;
                            console.log(`[WHATSAPP] Found alternate connected client for tenant ${tenantId} under branch ${sibling.id} in /api/send. Redirecting send...`);
                            break;
                        }
                    }
                }
            } catch (err) {
                console.error("[WHATSAPP] Error resolving tenant sibling client in /api/send:", err);
            }
        }

        // If no sibling was found or active in memory, get or initialize
        if (!client) {
            client = await getClientForBranch(resolvedBranchId);
        }

        if (!client || !client.info) {
            return res.status(503).json({ error: 'WhatsApp client is not connected or ready' });
        }
        
        let chatId = null;
        if (foundProspect) {
            chatId = formatWhatsAppJid(foundProspect.phone, foundProspect.whatsappId);
        }
        if (!chatId && phone) {
            chatId = formatWhatsAppJid(phone, null);
        }

        if (!chatId) {
            return res.status(400).json({ error: 'Could not resolve a valid WhatsApp JID for recipient' });
        }

        // Validate or refine JID with getNumberId if it is a standard @c.us contact (protected with timeout)
        if (chatId.endsWith('@c.us')) {
            try {
                const rawUser = chatId.split('@')[0];
                const resolved = await Promise.race([
                    client.getNumberId(rawUser),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
                ]).catch(() => null);
                if (resolved && resolved._serialized) {
                    chatId = resolved._serialized;
                }
            } catch (e) {}
        }

        let sentMsg;
        if (media && media.data && media.mimetype) {
            let base64Data = media.data;
            if (base64Data.includes(';base64,')) {
                base64Data = base64Data.split(';base64,')[1];
            }
            const mediaObj = new MessageMedia(media.mimetype, base64Data, media.filename || 'archivo');
            sentMsg = await safeSendMessage(client, chatId, mediaObj, message ? { caption: message } : undefined);
        } else {
            sentMsg = await safeSendMessage(client, chatId, message || '');
        }

        if (!sentMsg || !sentMsg.id) {
            throw new Error('Failed to send message: empty response from WhatsApp client');
        }
        const messageIdSerialized = sentMsg.id && sentMsg.id._serialized ? sentMsg.id._serialized : `WA_${Date.now()}`;
        const msgTimestamp = sentMsg.timestamp ? new Date(sentMsg.timestamp * 1000) : new Date();

        if (prospectId) {
            let bodyText = message || '';
            if (media && media.data && media.mimetype) {
                let mediaTag = '📎 [Archivo]';
                if (media.mimetype.startsWith('image/')) {
                    mediaTag = '📎 [Imagen]';
                } else if (media.mimetype.startsWith('video/')) {
                    mediaTag = '📎 [Video]';
                } else if (media.mimetype.startsWith('audio/')) {
                    mediaTag = '📎 [Audio]';
                } else if (media.mimetype === 'application/pdf' || (media.filename && media.filename.toLowerCase().endsWith('.pdf'))) {
                    mediaTag = media.filename ? `📎 [Documento: ${media.filename}]` : '📎 [Documento]';
                } else if (media.filename) {
                    mediaTag = `📎 [Documento: ${media.filename}]`;
                }
                bodyText = mediaTag + (message ? ": " + message : "");
            }

            // If media was sent, save it to WhatsAppMediaRequest so it can be viewed/downloaded instantly
            if (media && media.data && media.mimetype) {
                let cleanData = media.data;
                if (cleanData.includes(';base64,')) cleanData = cleanData.split(';base64,')[1];
                for (const { client: anyDb } of allDbs) {
                    try {
                        await anyDb.whatsAppMediaRequest.upsert({
                            where: { messageId: messageIdSerialized },
                            create: {
                                messageId: messageIdSerialized,
                                status: 'COMPLETED',
                                mimetype: media.mimetype,
                                filename: media.filename || (media.mimetype === 'application/pdf' ? 'documento.pdf' : 'archivo'),
                                data: cleanData
                            },
                            update: {
                                status: 'COMPLETED',
                                mimetype: media.mimetype,
                                filename: media.filename || (media.mimetype === 'application/pdf' ? 'documento.pdf' : 'archivo'),
                                data: cleanData
                            }
                        });
                    } catch (e) {}
                }
            }

            // 1. If explicit pendingMessageId is passed from Next.js, update it across ALL DBs immediately!
            if (pendingMessageId) {
                for (const { client: anyDb, name: dbName } of allDbs) {
                    try {
                        const updated = await anyDb.whatsAppMessage.updateMany({
                            where: { id: pendingMessageId },
                            data: {
                                messageId: messageIdSerialized,
                                body: bodyText,
                                status: 1,
                                timestamp: msgTimestamp
                            }
                        });
                        if (updated && updated.count > 0) {
                            console.log(`[WHATSAPP] Successfully linked and updated pendingMessageId ${pendingMessageId} in DB: ${dbName}`);
                        }
                    } catch (e) {}
                }
            }

            const targetDbs = [prospectDbClient];
            if (prospectDbClient !== masterPrisma) targetDbs.push(masterPrisma);
            if (tenantId && tenantPrismaMap.has(tenantId)) {
                const tClient = tenantPrismaMap.get(tenantId);
                if (!targetDbs.includes(tClient)) targetDbs.push(tClient);
            }
            try {
                const branchPrisma = await getPrismaForBranch(resolvedBranchId);
                if (branchPrisma && branchPrisma.client && !targetDbs.includes(branchPrisma.client)) {
                    targetDbs.push(branchPrisma.client);
                }
            } catch (e) {}

            for (const tDb of targetDbs) {
                try {
                    let linkedPending = false;

                    // 1. If explicit pendingMessageId is passed, verify if already linked
                    if (pendingMessageId) {
                        try {
                            const check = await tDb.whatsAppMessage.findUnique({
                                where: { id: pendingMessageId }
                            });
                            if (check && check.messageId === messageIdSerialized) {
                                linkedPending = true;
                            }
                        } catch (e) {}
                    }

                    // 2. If not linked yet, look for any pending message with messageId: null for this prospect
                    if (!linkedPending) {
                        const pendingMsg = await tDb.whatsAppMessage.findFirst({
                            where: {
                                prospectId: prospectId,
                                messageId: null,
                                isFromMe: true
                            },
                            orderBy: { timestamp: 'desc' }
                        });

                        if (pendingMsg) {
                            await tDb.whatsAppMessage.update({
                                where: { id: pendingMsg.id },
                                data: {
                                    messageId: messageIdSerialized,
                                    body: bodyText,
                                    status: 1,
                                    timestamp: msgTimestamp
                                }
                            }).catch(() => {});
                            linkedPending = true;
                        }
                    }

                    // 3. If no pending message existed, insert only if not already saved
                    if (!linkedPending) {
                        const existing = await tDb.whatsAppMessage.findFirst({
                            where: { messageId: messageIdSerialized }
                        });

                        if (!existing) {
                            await tDb.whatsAppMessage.create({
                                data: {
                                    messageId: messageIdSerialized,
                                    prospectId: prospectId,
                                    body: bodyText,
                                    isFromMe: true,
                                    status: 1, // Sent (1 tick)
                                    timestamp: msgTimestamp
                                }
                            }).catch(() => {});
                        }
                    }

                    console.log(`[WHATSAPP] /api/send saved message ${messageIdSerialized} successfully.`);

                    await tDb.prospect.update({
                        where: { id: prospectId },
                        data: { updatedAt: new Date() }
                    }).catch(() => {});
                } catch (e) {}
            }
        }

        res.json({ success: true, messageId: messageIdSerialized });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
});

// Helper to download media with fallback to Puppeteer Store and base64 thumbnail
async function downloadMediaForMessage(client, activeMessageId, chatId) {
    let msg = null;

    if (chatId) {
        try {
            const chat = await client.getChatById(chatId);
            if (chat) {
                const messages = await chat.fetchMessages({ limit: 100 });
                msg = messages.find(m => m.id._serialized === activeMessageId);
            }
        } catch (e) {}
    }

    if (!msg) {
        try {
            msg = await client.getMessageById(activeMessageId);
        } catch (e) {}
    }

    let media = null;
    if (msg && (msg.hasMedia || msg.type === 'document' || msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'ptt' || msg.type === 'sticker')) {
        try {
            media = await msg.downloadMedia();
        } catch (e) {}
    }

    // Enhance media metadata if available from message
    if (media && media.data) {
        if (!media.filename) {
            media.filename = msg?.filename || msg?._data?.filename || (media.mimetype?.includes('pdf') ? 'documento.pdf' : (media.mimetype?.startsWith('image/') ? 'imagen.jpg' : 'archivo'));
        }
        if (!media.mimetype) {
            media.mimetype = msg?.mimetype || msg?._data?.mimetype || (media.filename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        }
    }

    // Fallback: evaluate in Puppeteer page to search Store and download directly
    if ((!media || !media.data) && client.pupPage) {
        try {
            media = await client.pupPage.evaluate(async (msgId) => {
                try {
                    let m = window.Store?.Msg?.get(msgId);
                    if (!m && window.Store?.Chat?.models) {
                        for (const c of window.Store.Chat.models) {
                            if (c.msgs && c.msgs.get(msgId)) {
                                m = c.msgs.get(msgId);
                                break;
                            }
                        }
                    }
                    if (!m) return null;

                    if (window.WWebJS && typeof window.WWebJS.downloadMedia === 'function') {
                        try {
                            const res = await window.WWebJS.downloadMedia(msgId);
                            if (res && res.data) return res;
                        } catch (e) {}
                    }

                    let bodyData = m.body || m._data?.body;
                    let mimetype = m.mimetype || m._data?.mimetype;
                    let filename = m.filename || m._data?.filename;

                    if (!mimetype) {
                        if (m.type === 'document' || (filename && filename.toLowerCase().endsWith('.pdf'))) {
                            mimetype = 'application/pdf';
                        } else if (m.type === 'image') {
                            mimetype = 'image/jpeg';
                        } else {
                            mimetype = 'application/octet-stream';
                        }
                    }

                    if (!filename) {
                        filename = mimetype.includes('pdf') ? 'documento.pdf' : (mimetype.startsWith('image/') ? 'imagen.jpg' : 'archivo');
                    }

                    if (bodyData && (bodyData.startsWith('/9j/') || bodyData.startsWith('JVBERi0') || bodyData.startsWith('data:') || bodyData.length > 50)) {
                        let cleanData = bodyData;
                        if (cleanData.includes(';base64,')) {
                            cleanData = cleanData.split(';base64,')[1];
                        }
                        return { data: cleanData, mimetype, filename };
                    }
                    return null;
                } catch (e) {
                    return null;
                }
            }, activeMessageId);
        } catch (e) {}
    }

    return media;
}

// Express GET endpoint to retrieve and download media on-demand
app.get('/api/media/:messageId', async (req, res) => {
    const { messageId } = req.params;
    try {
        let dbMsg = null;
        let foundDbClient = null;

        for (const { client: dbClient } of getAllPrismaClients()) {
            try {
                dbMsg = await dbClient.whatsAppMessage.findFirst({
                    where: {
                        OR: [
                            { messageId: messageId },
                            { id: messageId }
                        ]
                    }
                });
                if (dbMsg) {
                    foundDbClient = dbClient;
                    break;
                }
            } catch (e) {}
        }

        if (!dbMsg || !foundDbClient) {
            return res.status(404).json({ error: 'Message not found in database' });
        }

        // Check if DB body already has embedded base64 data
        if (dbMsg.body) {
            const jpegMatch = dbMsg.body.match(/(\/9j\/[A-Za-z0-9+/=]{40,})/);
            if (jpegMatch) {
                return res.json({
                    mimetype: 'image/jpeg',
                    data: jpegMatch[1],
                    filename: 'imagen.jpg'
                });
            }
        }

        const activeMessageId = dbMsg.messageId || messageId;

        const prospect = await foundDbClient.prospect.findUnique({
            where: { id: dbMsg.prospectId }
        });

        if (!prospect) {
            return res.status(404).json({ error: 'Prospect not found' });
        }

        const branchId = prospect.branchId;
        if (!branchId) {
            return res.status(400).json({ error: 'Prospect has no branch associated' });
        }

        const client = await getClientForBranch(branchId);
        if (!client || !client.info) {
            return res.status(503).json({ error: 'WhatsApp client is not initialized or ready for this branch' });
        }

        let chatId = formatWhatsAppJid(prospect.phone, prospect.whatsappId);
        console.log(`[WHATSAPP] Fetching media for message ${activeMessageId} in chat ${chatId} using client for branch ${branchId}`);

        const media = await downloadMediaForMessage(client, activeMessageId, chatId);
        if (!media || !media.data) {
            return res.status(500).json({ error: 'Failed to download media from WhatsApp CDN' });
        }

        res.json({
            mimetype: media.mimetype || 'image/jpeg',
            data: media.data,
            filename: media.filename || 'archivo'
        });
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ error: error.message || 'Failed to download media' });
    }
});

// Express POST endpoint to manually trigger chats history synchronization
app.post('/api/sync', async (req, res) => {
    const branchId = req.body?.branchId || req.query?.branchId;
    if (!branchId) {
        return res.status(400).json({ error: 'branchId is required' });
    }

    try {
        const resolvedBranchId = await getPrimaryBranchId(branchId);
        const client = clients.get(resolvedBranchId);
        if (!client || !client.info) {
            return res.status(503).json({ error: 'WhatsApp client is not ready or connected for this branch' });
        }

        // Trigger manual sync in background
        console.log(`[WHATSAPP] Manual sync requested for branch ${branchId} (Resolved: ${resolvedBranchId}). Starting sync...`);
        syncRecentChatsHistory(resolvedBranchId, client)
            .then(() => console.log(`[WHATSAPP] Manual sync completed for branch ${branchId} (Resolved: ${resolvedBranchId})`))
            .catch(err => console.error(`[WHATSAPP] Manual sync failed for branch ${branchId} (Resolved: ${resolvedBranchId}):`, err));

        res.json({ success: true, message: 'Chats history sync triggered successfully in background' });
    } catch (err) {
        console.error(`[WHATSAPP] Error in manual sync for branch ${branchId}:`, err);
        res.status(500).json({ error: err.message || 'Failed to trigger history sync' });
    }
});

// Express GET endpoint to lazily initialize or ping status
app.get('/api/status', async (req, res) => {
    const { branchId } = req.query;
    if (!branchId) {
        return res.status(400).json({ error: 'branchId is required' });
    }
    try {
        const resolvedBranchId = await getPrimaryBranchId(branchId);
        console.log(`[WHATSAPP] Ping status received for branch: ${branchId} (Resolved: ${resolvedBranchId}). Ensuring initialization...`);
        const client = await getClientForBranch(resolvedBranchId);
        res.json({ success: true, status: client.info ? 'CONNECTED' : 'INITIALIZING' });
    } catch (error) {
        console.error(`[WHATSAPP] Error in status ping for branch ${branchId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to ensure client status' });
    }
});

app.post('/api/debug-eval', async (req, res) => {
    const { branchId, code } = req.body;
    try {
        const resolvedBranchId = await getPrimaryBranchId(branchId || '97fbcaee-b61c-4bdc-bb5f-ebacf98222bf');
        const client = clients.get(resolvedBranchId);
        if (!client || !client.pupPage) return res.status(503).json({ error: 'Client not ready' });
        const result = await client.pupPage.evaluate((fnStr) => {
            const fn = new Function(fnStr);
            return fn();
        }, code);
        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/debug-send', async (req, res) => {
    const { branchId, chatId, message } = req.body;
    try {
        const resolvedBranchId = await getPrimaryBranchId(branchId);
        const client = clients.get(resolvedBranchId);
        if (!client || !client.info) return res.status(503).json({ error: 'Client not ready' });

        const evalResult = await client.pupPage.evaluate(async (targetChatId, text) => {
            try {
                const results = {};
                results.hasStore = !!window.Store;
                results.hasWWebJS = !!window.WWebJS;
                results.hasCollections = !!(window.require && window.require('WAWebCollections'));
                
                const chatWid = window.require('WAWebWidFactory').createWid(targetChatId);
                results.chatWid = chatWid ? { user: chatWid.user, server: chatWid.server, _serialized: chatWid._serialized } : null;
                
                let chat = window.require('WAWebCollections').Chat.get(chatWid);
                results.chatFromGet = !!chat;
                
                if (!chat) {
                    const findAction = window.require('WAWebFindChatAction');
                    results.hasFindAction = !!findAction;
                    if (findAction) {
                        try {
                            const found = await findAction.findOrCreateLatestChat(chatWid);
                            results.foundFromAction = !!found;
                            chat = found?.chat;
                        } catch (findErr) {
                            results.findErr = findErr.message;
                        }
                    }
                }
                
                results.finalChat = !!chat;
                
                if (chat) {
                    const newId = await window.require('WAWebMsgKey').newId();
                    const { getMaybeMeLidUser, getMaybeMePnUser } = window.require('WAWebUserPrefsMeUser');
                    const from = chat.id.isLid() ? getMaybeMeLidUser() : getMaybeMePnUser();
                    
                    const newMsgKey = new (window.require('WAWebMsgKey'))({
                        from: from,
                        to: chat.id,
                        id: newId,
                        selfDir: 'out'
                    });
                    
                    const msgPayload = {
                        id: newMsgKey,
                        ack: 0,
                        body: text,
                        from: from,
                        to: chat.id,
                        local: true,
                        self: 'out',
                        t: parseInt(new Date().getTime() / 1000),
                        isNewMsg: true,
                        type: 'chat'
                    };
                    
                    const [msgPromise, sendMsgResultPromise] = window.require('WAWebSendMsgChatAction').addAndSendMsgToChat(chat, msgPayload);
                    await msgPromise;
                    results.msgSent = true;
                    results.msgKey = newMsgKey._serialized;
                }
                
                return results;
            } catch (err) {
                return { error: err.message, stack: err.stack };
            }
        }, chatId, message);
        
        res.json({ success: true, evalResult });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/debug-eval', async (req, res) => {
    const { branchId, code } = req.body;
    try {
        const resolvedBranchId = await getPrimaryBranchId(branchId);
        const client = clients.get(resolvedBranchId);
        if (!client || !client.info) return res.status(503).json({ error: 'Client not ready' });

        const result = await client.pupPage.evaluate(async (src) => {
            try {
                const fn = new Function('return (async () => {' + src + '})()');
                return { success: true, data: await fn() };
            } catch (err) {
                return { success: false, error: err.message, stack: err.stack };
            }
        }, code);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/debug-screenshot', async (req, res) => {
    try {
        const firstClient = Array.from(clients.values()).find(c => c && c.pupPage);
        if (!firstClient || !firstClient.pupPage) return res.status(503).send('No client with active pupPage');
        const buffer = await firstClient.pupPage.screenshot({ type: 'png' });
        res.contentType('image/png').send(buffer);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Express API to logout, clean credentials and immediately initialize a new code QR scanner
app.post('/api/logout', async (req, res) => {
    const branchId = req.query.branchId || req.body.branchId;
    if (!branchId) {
        return res.status(400).json({ error: 'branchId is required' });
    }

    try {
        const resolvedBranchId = await getPrimaryBranchId(branchId);
        console.log(`[WHATSAPP] Logout request received for branch: ${branchId} (Resolved: ${resolvedBranchId}). Disconnecting client...`);
        const client = clients.get(resolvedBranchId);
        if (client) {
            try {
                await client.logout();
            } catch (err) {
                console.warn(`[WHATSAPP] client.logout() failed for branch ${resolvedBranchId} (expected if not logged in):`, err.message);
            }
            try {
                await client.destroy();
            } catch (err) {
                console.warn(`[WHATSAPP] client.destroy() failed for branch ${resolvedBranchId}:`, err.message);
            }
            clients.delete(resolvedBranchId);
        }

        // Clean branch-specific credentials folder
        const shortBranchId = resolvedBranchId.split('-')[0];
        const authPath = path.resolve(process.cwd(), `./.wwebjs_auth/session-br-${shortBranchId}`);
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log(`[WHATSAPP] Credentials folder ${authPath} deleted successfully.`);
            } catch (fsErr) {
                console.error(`[WHATSAPP] Failed to delete folder ${authPath}:`, fsErr);
            }
        }

        // Reset database session status across ALL databases
        try {
            await updateSessionInAllDbs(resolvedBranchId, {
                status: 'DISCONNECTED',
                sessionData: null
            });
            console.log(`[WHATSAPP] Session status updated to DISCONNECTED across all DBs for branch ${resolvedBranchId}.`);
        } catch (dbErr) {
            console.error(`[WHATSAPP] Failed to reset database session status for branch ${resolvedBranchId}:`, dbErr);
        }

        // Boot a brand new client scanning instance immediately
        await getClientForBranch(resolvedBranchId, true);

        res.json({ success: true });
    } catch (error) {
        console.error(`[WHATSAPP] Logout error for branch ${branchId}:`, error);
        res.status(500).json({ error: 'Failed to complete logout and reinitialization' });
    }
});

app.get('/api/debug-contact/:jid', async (req, res) => {
    const { branchId } = req.query;
    if (!branchId) return res.status(400).json({ error: 'branchId is required' });

    try {
        const client = clients.get(branchId);
        if (!client) return res.status(503).json({ error: 'Client not ready for this branch' });
        const contact = await client.getContactById(req.params.jid);
        res.json({
            id: contact.id,
            number: contact.number,
            name: contact.name,
            pushname: contact.pushname,
            isWAContact: contact.isWAContact,
            raw: contact
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function selfHealLIDProspects(branchId) {
    console.log(`[WHATSAPP] Starting self-healing routine for LID prospects under branch ${branchId}...`);
    try {
        const client = clients.get(branchId);
        if (!client || !client.info) {
            console.warn(`[WHATSAPP] Client not connected for branch ${branchId}, skipping self-healing.`);
            return;
        }

        const { client: branchDb } = await getPrismaForBranch(branchId);
        const targetDbs = [branchDb];
        if (branchDb !== masterPrisma) targetDbs.push(masterPrisma);

        for (const dbClient of targetDbs) {
            try {
                const prospects = await dbClient.prospect.findMany({
                    where: {
                        branchId: branchId,
                        OR: [
                            { phone: { startsWith: '1' } },
                            { phone: { startsWith: '2' } },
                            { phone: { startsWith: '3' } },
                            { phone: { startsWith: '4' } },
                            { phone: { startsWith: '5' } },
                            { phone: { startsWith: '6' } },
                            { phone: { startsWith: '7' } },
                            { phone: { startsWith: '8' } },
                            { phone: { startsWith: '9' } },
                        ]
                    }
                });

                const lidProspects = prospects.filter(p => p.phone && p.phone.length > 13);
                console.log(`[WHATSAPP] Found ${lidProspects.length} potential LID prospects in DB for healing under branch ${branchId}.`);

                for (const p of lidProspects) {
                    const originalLid = p.phone;
                    try {
                        console.log(`[WHATSAPP] Resolving contact for potential LID: ${originalLid}`);
                        const contact = await client.getContactById(`${originalLid}@lid`);
                        
                        if (contact && contact.id && contact.id.user) {
                            const realPhone = contact.id.user;
                            console.log(`[WHATSAPP] Resolved LID ${originalLid} to real phone: ${realPhone}`);
                            
                            // Check if another prospect already exists with this realPhone and branchId
                            const existingProspect = await dbClient.prospect.findFirst({
                                where: {
                                    phone: realPhone,
                                    branchId: p.branchId,
                                    id: { not: p.id }
                                }
                            });

                            if (existingProspect) {
                                console.log(`[WHATSAPP] Duplicate prospect found with phone ${realPhone}. Merging prospect ${p.id} into ${existingProspect.id}`);
                                
                                await dbClient.whatsAppMessage.updateMany({
                                    where: { prospectId: p.id },
                                    data: { prospectId: existingProspect.id }
                                });

                                if (!existingProspect.whatsappId) {
                                    await dbClient.prospect.update({
                                        where: { id: existingProspect.id },
                                        data: { whatsappId: originalLid }
                                    });
                                }

                                await dbClient.prospect.delete({
                                    where: { id: p.id }
                                });
                                
                                console.log(`[WHATSAPP] Successfully merged prospect ${p.name} into ${existingProspect.name}.`);

                                const resetResult = await dbClient.whatsAppMessage.updateMany({
                                    where: {
                                        prospectId: existingProspect.id,
                                        isFromMe: true,
                                        OR: [
                                            { messageId: { startsWith: 'FAILED_' } },
                                            { messageId: null }
                                        ]
                                    },
                                    data: {
                                        messageId: null
                                    }
                                });
                                console.log(`[WHATSAPP] Reset ${resetResult.count} failed/pending messages for standard prospect ${existingProspect.name} to retry.`);
                            } else {
                                await dbClient.prospect.update({
                                    where: { id: p.id },
                                    data: {
                                        phone: realPhone,
                                        whatsappId: originalLid
                                    }
                                });

                                const resetResult = await dbClient.whatsAppMessage.updateMany({
                                    where: {
                                        prospectId: p.id,
                                        isFromMe: true,
                                        OR: [
                                            { messageId: { startsWith: 'FAILED_' } },
                                            { messageId: null }
                                        ]
                                    },
                                    data: {
                                        messageId: null
                                    }
                                });
                                console.log(`[WHATSAPP] Updated prospect ${p.name}. Reset ${resetResult.count} failed/pending messages to retry.`);
                            }
                        } else {
                            console.warn(`[WHATSAPP] Could not resolve contact.id.user for LID: ${originalLid}`);
                        }
                    } catch (err) {
                        console.error(`[WHATSAPP] Failed to self-heal prospect ${p.name} (${originalLid}):`, err.message);
                    }
                }
            } catch (dbErr) {}
        }
    } catch (e) {
        console.error(`[WHATSAPP] Self-healing routine failed for branch ${branchId}:`, e);
    }
}

app.post('/api/heal', async (req, res) => {
    const branchId = req.query.branchId || req.body.branchId;
    if (!branchId) return res.status(400).json({ error: 'branchId is required' });

    try {
        const client = clients.get(branchId);
        if (!client || !client.info) {
            return res.status(503).json({ error: 'WhatsApp client is not ready' });
        }
        // Run self-healing
        selfHealLIDProspects(branchId).catch(err => console.error(`[WHATSAPP] Manual self-healing failed for branch ${branchId}:`, err));
        res.json({ success: true, message: 'Self-healing routine triggered in background.' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to trigger self-healing' });
    }
});

// Polling function to process pending media requests across all databases
let isMediaPolling = false;

setInterval(async () => {
    if (isMediaPolling) return;

    try {
        isMediaPolling = true;

        const allClients = getAllPrismaClients();

        for (const { name: dbName, client: dbClient } of allClients) {
            let pendingRequests = [];
            try {
                pendingRequests = await dbClient.whatsAppMediaRequest.findMany({
                    where: { status: 'PENDING' }
                });
            } catch (e) {
                continue;
            }

            for (const req of pendingRequests) {
                console.log(`[MEDIA POLL] Processing media request for message ${req.messageId} in DB: ${dbName}`);
                try {
                    // Find the message in DB to get prospect
                    const dbMsg = await dbClient.whatsAppMessage.findFirst({
                        where: {
                            OR: [
                                { messageId: req.messageId },
                                { id: req.messageId }
                            ]
                        }
                    });

                    if (!dbMsg) {
                        console.error(`[MEDIA POLL] Message ${req.messageId} not found in DB ${dbName}`);
                        await dbClient.whatsAppMediaRequest.update({
                            where: { id: req.id },
                            data: { status: 'FAILED' }
                        });
                        continue;
                    }

                    const activeMessageId = dbMsg.messageId || req.messageId;

                    const prospect = await dbClient.prospect.findUnique({
                        where: { id: dbMsg.prospectId }
                    });

                    if (!prospect || !prospect.branchId) {
                        console.error(`[MEDIA POLL] Prospect not found or has no branch for message ${req.messageId}`);
                        await dbClient.whatsAppMediaRequest.update({
                            where: { id: req.id },
                            data: { status: 'FAILED' }
                        });
                        continue;
                    }

                    const branchId = prospect.branchId;
                    let client = clients.get(branchId);

                    // Fallback check: find any connected sibling client under the same tenant
                    if (!client || !client.info) {
                        const branch = await dbClient.branch.findUnique({
                            where: { id: branchId },
                            select: { tenantId: true }
                        });
                        if (branch && branch.tenantId) {
                            const tenantBranches = await dbClient.branch.findMany({
                                where: { tenantId: branch.tenantId, isActive: true },
                                select: { id: true }
                            });
                            for (const tb of tenantBranches) {
                                const alternateClient = clients.get(tb.id);
                                if (alternateClient && alternateClient.info) {
                                    client = alternateClient;
                                    break;
                                }
                            }
                        }
                    }

                    if (!client || !client.info) {
                        console.error(`[MEDIA POLL] No active WhatsApp client found for branch/tenant ${branchId}`);
                        await dbClient.whatsAppMediaRequest.update({
                            where: { id: req.id },
                            data: { status: 'FAILED' }
                        });
                        continue;
                    }

                    let chatId = formatWhatsAppJid(prospect.phone, prospect.whatsappId);
                    if (!chatId) {
                        console.error(`[MEDIA POLL] Prospect has no valid phone for message ${req.messageId}`);
                        await dbClient.whatsAppMediaRequest.update({
                            where: { id: req.id },
                            data: { status: 'FAILED' }
                        });
                        continue;
                    }

                    // 1. Direct check if dbMsg body has embedded base64
                    let media = null;
                    if (dbMsg.body) {
                        const jpegMatch = dbMsg.body.match(/(\/9j\/[A-Za-z0-9+/=]{40,})/);
                        if (jpegMatch) {
                            media = {
                                mimetype: 'image/jpeg',
                                data: jpegMatch[1],
                                filename: 'imagen.jpg'
                            };
                        }
                    }

                    if (!media) {
                        media = await downloadMediaForMessage(client, activeMessageId, chatId);
                    }

                    if (!media || !media.data) {
                        console.error(`[MEDIA POLL] Failed downloadMedia() from WA CDN for message ${req.messageId}`);
                        await dbClient.whatsAppMediaRequest.update({
                            where: { id: req.id },
                            data: { status: 'FAILED' }
                        });
                        continue;
                    }

                    // Update the media request to COMPLETED with base64 data!
                    await dbClient.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: {
                            status: 'COMPLETED',
                            mimetype: media.mimetype || 'image/jpeg',
                            filename: media.filename || 'archivo',
                            data: media.data
                        }
                    });
                    console.log(`[MEDIA POLL] Successfully completed media request for message ${req.messageId} in DB: ${dbName}`);

                } catch (err) {
                    console.error(`[MEDIA POLL] Error processing media request ${req.messageId}:`, err);
                    await dbClient.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    }).catch(() => {});
                }
            }
        }

    } catch (err) {
        console.error("[MEDIA POLL] Error in pollMediaRequests:", err);
    } finally {
        isMediaPolling = false;
    }
}, 2000);

// Polling function to process pending sync requests across all databases
let isSyncPolling = false;

setInterval(async () => {
    if (isSyncPolling) return;

    try {
        isSyncPolling = true;

        const allClients = getAllPrismaClients();

        for (const { name: dbName, client: dbClient } of allClients) {
            let pendingSyncRequests = [];
            try {
                pendingSyncRequests = await dbClient.whatsAppSyncRequest.findMany({
                    where: { status: 'PENDING' }
                });
            } catch (e) {
                continue;
            }

            for (const req of pendingSyncRequests) {
                try {
                    const resolvedBranchId = await getPrimaryBranchId(req.branchId);
                    console.log(`[SYNC POLL] Processing sync request for branch ${req.branchId} (Resolved: ${resolvedBranchId}) in DB: ${dbName}`);
                    
                    let client = clients.get(resolvedBranchId);

                    const isInitializing = clients.has(resolvedBranchId) && (!client || !client.info);

                    if (!client || !client.info) {
                        if (isInitializing) {
                            console.log(`[SYNC POLL] WhatsApp client for branch ${resolvedBranchId} (Request: ${req.branchId}) is still initializing. Postponing sync request...`);
                            continue;
                        }

                        console.error(`[SYNC POLL] No active WhatsApp client found for branch/tenant ${resolvedBranchId} (Request: ${req.branchId})`);
                        await dbClient.whatsAppSyncRequest.update({
                            where: { id: req.id },
                            data: { status: 'FAILED' }
                        });
                        continue;
                    }

                    // Run Phase 1 sync: top 30 chats and 50 messages each
                    console.log(`[SYNC POLL] Starting historical sync for branch ${resolvedBranchId} (Request: ${req.branchId})`);
                    await syncRecentChatsHistory(resolvedBranchId, client);

                    // Mark the sync request as COMPLETED
                    await dbClient.whatsAppSyncRequest.update({
                        where: { id: req.id },
                        data: { status: 'COMPLETED' }
                    });
                    console.log(`[SYNC POLL] Successfully completed sync request for branch ${resolvedBranchId} in DB: ${dbName}`);

                } catch (err) {
                    console.error(`[SYNC POLL] Error processing sync request for branch ${req.branchId}:`, err);
                    await dbClient.whatsAppSyncRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    }).catch(() => {});
                }
            }
        }

    } catch (err) {
        console.error("[SYNC POLL] Error in pollSyncRequests:", err);
    } finally {
        isSyncPolling = false;
    }
}, 2000);

// Polling function to send pending messages across all databases
let isPolling = false;

setInterval(async () => {
    if (isPolling) return;

    try {
        isPolling = true;

        const allClients = getAllPrismaClients();

        for (const { name: dbName, client: dbClient } of allClients) {
            let pendingMessages = [];
            try {
                pendingMessages = await dbClient.whatsAppMessage.findMany({
                    where: {
                        messageId: null,
                        isFromMe: true,
                        timestamp: {
                            lte: new Date(Date.now() - 5000)
                        }
                    },
                    include: {
                        prospect: true
                    },
                    orderBy: {
                        timestamp: 'asc'
                    }
                });
            } catch (e) {
                continue;
            }

            for (const msg of pendingMessages) {
                // Verify it wasn't deleted or sent in the meantime
                const stillPending = await dbClient.whatsAppMessage.findUnique({
                    where: { id: msg.id }
                });
                if (!stillPending || stillPending.messageId) continue;

                // Transiently claim message to prevent duplicate polling cycles from sending twice
                await dbClient.whatsAppMessage.update({
                    where: { id: msg.id },
                    data: { messageId: `CLAIMED_${Date.now()}` }
                }).catch(() => {});

                if (!msg.prospect) {
                    console.warn(`[WHATSAPP] Pending message ${msg.id} has no prospect.`);
                    continue;
                }

                const branchId = msg.prospect.branchId;
                const resolvedBranchId = await getPrimaryBranchId(branchId);
                let client = clients.get(resolvedBranchId);
                
                if (!client || !client.info) {
                    // Release claim so it can be picked up when client is ready
                    await dbClient.whatsAppMessage.update({
                        where: { id: msg.id },
                        data: { messageId: null }
                    }).catch(() => {});
                    continue;
                }

                try {
                    let chatId = formatWhatsAppJid(msg.prospect.phone, msg.prospect.whatsappId);
                    if (!chatId) {
                        await dbClient.whatsAppMessage.update({
                            where: { id: msg.id },
                            data: { messageId: 'FAILED_NO_CHAT_ID' }
                        }).catch(() => {});
                        continue;
                    }

                    // Validate or refine JID with getNumberId if it is a standard @c.us contact (protected with timeout)
                    if (chatId.endsWith('@c.us')) {
                        try {
                            const rawUser = chatId.split('@')[0];
                            const resolved = await Promise.race([
                                client.getNumberId(rawUser),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
                            ]).catch(() => null);
                            if (resolved && resolved._serialized) {
                                chatId = resolved._serialized;
                            }
                        } catch (e) {}
                    }

                    let sentMsg = null;
                    try {
                        sentMsg = await safeSendMessage(client, chatId, msg.body);
                        if (!sentMsg || !sentMsg.id) {
                            throw new Error('No message response from client.sendMessage');
                        }

                        // Resolve JID asynchronously after sending if it was not resolved yet
                        if (!msg.prospect.whatsappId || msg.prospect.whatsappId === '0') {
                            const resolvedJid = sentMsg.to || chatId;
                            const whatsappIdUser = resolvedJid.split('@')[0];
                            dbClient.prospect.update({
                                where: { id: msg.prospect.id },
                                data: { whatsappId: whatsappIdUser }
                            }).catch(e => console.error(`[WHATSAPP] Failed to update JID after send:`, e.message));
                        }
                    } catch (sendError) {
                        console.error(`Failed to send pending message to ${msg.prospect?.phone}:`, sendError.message || sendError);
                        await dbClient.whatsAppMessage.update({
                            where: { id: msg.id },
                            data: {
                                messageId: 'FAILED_' + Date.now()
                            }
                        }).catch(() => {});
                        continue;
                    }

                    const messageIdSerialized = sentMsg.id && sentMsg.id._serialized ? sentMsg.id._serialized : `WA_${Date.now()}`;
                    const msgTimestamp = sentMsg.timestamp ? new Date(sentMsg.timestamp * 1000) : new Date();

                    // Safe update: isolate database transaction from actual sending
                    try {
                        const checkAgain = await dbClient.whatsAppMessage.findUnique({
                            where: { id: msg.id }
                        });

                        if (checkAgain && (checkAgain.messageId === null || checkAgain.messageId.startsWith('CLAIMED_') || checkAgain.messageId.startsWith('FAILED_'))) {
                            await dbClient.whatsAppMessage.update({
                                where: { id: msg.id },
                                data: {
                                    messageId: messageIdSerialized,
                                    status: 1, // Sent -> single tick (palomita)
                                    timestamp: msgTimestamp
                                }
                            });
                            console.log(`[WHATSAPP] Polling loop updated message ${msg.id} to messageId ${messageIdSerialized} in DB: ${dbName}`);
                        } else {
                            console.log(`[WHATSAPP] Polling loop: Message ${msg.id} was already updated/linked by message_create.`);
                        }
                    } catch (dbErr) {
                        console.warn(`[WHATSAPP] Safe database link warning (soft unique constraint handled):`, dbErr.message);
                    }
                    
                    console.log(`[WHATSAPP] Sent pending message to ${chatId}`);

                    // Wait 1.5 seconds between messages in the same batch to avoid spam
                    if (pendingMessages.indexOf(msg) < pendingMessages.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                } catch (loopErr) {
                    console.error(`[WHATSAPP] Polling loop exception:`, loopErr);
                }
            }
        }
    } catch (error) {
        console.error('Error polling for pending messages:', error);
    } finally {
        isPolling = false;
    }
}, 1000);

async function initializeAllActiveSessions() {
    console.log('[WHATSAPP] Pre-initializing connected/active sessions across all tenant DBs...');
    try {
        const activeBranchIds = new Set();
        const allClients = getAllPrismaClients();

        for (const { client: dbClient } of allClients) {
            try {
                const sessions = await dbClient.whatsAppSession.findMany({
                    where: {
                        status: { in: ['CONNECTED', 'QR_READY'] }
                    }
                });
                for (const s of sessions) {
                    activeBranchIds.add(s.branchId);
                }
            } catch (e) {}
        }
        
        console.log(`[WHATSAPP] Found ${activeBranchIds.size} unique sessions to pre-initialize.`);
        for (const branchId of activeBranchIds) {
            console.log(`[WHATSAPP] Pre-initializing branch ${branchId}...`);
            getClientForBranch(branchId).catch(err => {
                console.error(`[WHATSAPP] Failed to pre-initialize branch ${branchId}:`, err);
            });
        }
    } catch (e) {
        console.error('[WHATSAPP] Error pre-initializing active sessions:', e);
    }
}

// -------------------------------------------------------------
// Database-driven Signaling Loop for WhatsApp Session Status
// -------------------------------------------------------------
let isSessionPolling = false;

async function pollWhatsAppSessions() {
    if (isSessionPolling) return;
    try {
        isSessionPolling = true;

        const allClients = getAllPrismaClients();

        for (const { name: dbName, client: dbClient } of allClients) {
            // 1. Process LOGGING_OUT sessions
            let loggingOutSessions = [];
            try {
                loggingOutSessions = await dbClient.whatsAppSession.findMany({
                    where: { status: 'LOGGING_OUT' }
                });
            } catch (e) {
                continue;
            }

            for (const session of loggingOutSessions) {
                const branchId = session.branchId;
                const resolvedBranchId = await getPrimaryBranchId(branchId);
                if (resolvedBranchId !== branchId) {
                    console.warn(`[POLLING] Found LOGGING_OUT session for sibling branch ${branchId}. Deleting duplicate record.`);
                    await dbClient.whatsAppSession.delete({ where: { id: session.id } }).catch(() => {});
                    continue;
                }

                console.log(`[POLLING] Found LOGGING_OUT session for branch ${branchId} in DB ${dbName}. Disconnecting client...`);
                
                const client = clients.get(branchId);
                if (client) {
                    try {
                        await client.logout();
                    } catch (err) {
                        console.warn(`[POLLING] client.logout() failed for branch ${branchId}:`, err.message);
                    }
                    try {
                        await client.destroy();
                    } catch (err) {
                        console.warn(`[POLLING] client.destroy() failed for branch ${branchId}:`, err.message);
                    }
                    clients.delete(branchId);
                    // Give OS some time to release file locks on Windows
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                // Clean credentials folder
                const shortBranchId = branchId.split('-')[0];
                const authPath = path.resolve(process.cwd(), `./.wwebjs_auth/session-br-${shortBranchId}`);
                if (fs.existsSync(authPath)) {
                    try {
                        fs.rmSync(authPath, { recursive: true, force: true });
                        console.log(`[POLLING] Credentials folder ${authPath} deleted successfully.`);
                    } catch (fsErr) {
                        console.error(`[POLLING] Failed to delete folder ${authPath}:`, fsErr);
                    }
                }

                // Set state to INITIALIZING across ALL DBs
                await updateSessionInAllDbs(branchId, {
                    status: 'INITIALIZING',
                    sessionData: null
                });

                // Recreate client immediately
                console.log(`[POLLING] Re-initializing fresh client for branch ${branchId}...`);
                await getClientForBranch(branchId, true);
            }

            // 2. Process INITIALIZING sessions that do not have an active client in memory
            let initializingSessions = [];
            try {
                initializingSessions = await dbClient.whatsAppSession.findMany({
                    where: { status: 'INITIALIZING' }
                });
            } catch (e) {
                continue;
            }

            for (const session of initializingSessions) {
                const branchId = session.branchId;
                const resolvedBranchId = await getPrimaryBranchId(branchId);
                if (resolvedBranchId !== branchId) {
                    console.warn(`[POLLING] Found INITIALIZING session for sibling branch ${branchId}. Deleting duplicate record.`);
                    await dbClient.whatsAppSession.delete({ where: { id: session.id } }).catch(() => {});
                    continue;
                }

                if (!clients.has(branchId)) {
                    console.log(`[POLLING] Found INITIALIZING session for branch ${branchId} in DB ${dbName} without active client. Spawning...`);
                    await getClientForBranch(branchId, true);
                }
            }

            // 3. Auto-resume CONNECTED/QR_READY sessions that do not have an active client in memory (e.g. service restart)
            let activeSessions = [];
            try {
                activeSessions = await dbClient.whatsAppSession.findMany({
                    where: { status: { in: ['CONNECTED', 'QR_READY'] } }
                });
            } catch (e) {
                continue;
            }

            for (const session of activeSessions) {
                const branchId = session.branchId;
                const resolvedBranchId = await getPrimaryBranchId(branchId);
                if (resolvedBranchId !== branchId) {
                    console.warn(`[POLLING] Found active/ready session for sibling branch ${branchId}. Deleting duplicate record.`);
                    await dbClient.whatsAppSession.delete({ where: { id: session.id } }).catch(() => {});
                    continue;
                }

                if (!clients.has(branchId)) {
                    console.log(`[POLLING] Found active/ready session for branch ${branchId} in DB ${dbName} but no client in memory. Resuming client...`);
                    await getClientForBranch(branchId, false);
                }
            }
        }

    } catch (err) {
        console.error("[POLLING] Error in pollWhatsAppSessions:", err);
    } finally {
        isSessionPolling = false;
    }
}

// Check every 5 seconds for any session signaling changes
setInterval(pollWhatsAppSessions, 5000);

// Keep-Alive Ping every 45 seconds to keep Chromium WebSocket connection warm
setInterval(async () => {
    for (const [branchId, client] of clients.entries()) {
        try {
            if (client && client.pupPage && !client.pupPage.isClosed()) {
                const state = await client.getState().catch(() => null);
                if (state && state !== 'CONNECTED') {
                    console.log(`[WHATSAPP KEEP-ALIVE] Branch ${branchId} state is ${state}`);
                }
            }
        } catch (e) {
            // Ignore keepalive ping errors
        }
    }
}, 45000);

const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp Microservice API running on port ${PORT}`);
    // Start active WhatsApp clients
    initializeAllActiveSessions();
    // Run an initial poll check immediately
    pollWhatsAppSessions();
});

// Capturadores globales de errores para evitar que excepciones de Puppeteer tiren el microservicio en producción
process.on('uncaughtException', (err) => {
    console.error('[FATAL CRASH PREVENTED] Uncaught Exception en el microservicio de WhatsApp:', err);
    if (err && err.message && err.message.includes('Execution context was destroyed')) {
        console.warn('[RECOVERY] Detectado error de contexto destruido en Puppeteer. El polling auto-recuperará las sesiones inactivas en el siguiente ciclo.');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL CRASH PREVENTED] Unhandled Rejection detectada en:', promise, 'razón:', reason);
});