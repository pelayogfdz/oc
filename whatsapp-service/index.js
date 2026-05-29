const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

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

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Active clients Map: branchId -> Client
const clients = new Map();

// Helper to resolve any branchId to its tenant's primary branchId (the first active branch ordered by createdAt: 'asc')
async function getPrimaryBranchId(branchId) {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { tenantId: true }
        });
        if (branch && branch.tenantId) {
            const firstBranch = await prisma.branch.findFirst({
                where: { tenantId: branch.tenantId, isActive: true },
                orderBy: { createdAt: 'asc' },
                select: { id: true }
            });
            if (firstBranch) {
                return firstBranch.id;
            }
        }
    } catch (e) {
        console.error(`[WHATSAPP] Error resolving primary branch for ${branchId}:`, e);
    }
    return branchId;
}

// Helper to save a single WhatsApp message and map it to a prospect
async function saveWhatsAppMessage(branchId, client, msg) {
    if (msg.isStatus) return;

    // Determine JID of other party
    const otherPartyJid = msg.fromMe ? msg.to : msg.from;
    if (!otherPartyJid || (!otherPartyJid.endsWith('@c.us') && !otherPartyJid.endsWith('@lid'))) return; // ignore groups, broadcast, status

    const phone = otherPartyJid.split('@')[0];

    // Avoid duplicates
    try {
        const existingMsg = await prisma.whatsAppMessage.findFirst({
            where: { messageId: msg.id._serialized }
        });
        if (existingMsg) {
            return; // Message already stored (e.g. sent from web and inserted manually)
        }
    } catch (dbErr) {
        console.error(`[WHATSAPP] Error checking duplicate message for branch ${branchId}:`, dbErr);
        return;
    }

    console.log(`[WHATSAPP] [Branch: ${branchId}] Message event - fromMe: ${msg.fromMe}, otherParty: ${phone}, body: ${msg.body || '[Vacio]'}`);

    try {
        // Fetch contact and normalize phone numbers
        let realPhone = phone;
        let whatsappId = null;
        let contactName = phone;

        try {
            // Fetch contact with a 2-second timeout to avoid hanging indefinitely in wwebjs
            const contact = await Promise.race([
                client.getContactById(otherPartyJid),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout resolving contact')), 2000))
            ]);
            
            contactName = contact.pushname || contact.name || phone;
            
            // Retrieve standard JID from contact.id if available
            if (contact.id && contact.id._serialized) {
                if (contact.id._serialized.endsWith('@c.us')) {
                    realPhone = contact.id.user;
                } else if (contact.id._serialized.endsWith('@lid')) {
                    realPhone = contact.id.user;
                }
            }
            
            if (otherPartyJid.endsWith('@lid')) {
                whatsappId = phone; // LID JID user
            } else {
                whatsappId = realPhone;
            }
        } catch (contactErr) {
            console.warn(`[WHATSAPP] Failed to fetch contact info (or timed out) for branch ${branchId}:`, contactErr.message);
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

        // Also search by original user JID parts
        if (!phoneVariations.includes(phone)) {
            phoneVariations.push(phone);
        }

        const orConditions = phoneVariations.map(p => ({ phone: p }));
        if (whatsappId) {
            orConditions.push({ whatsappId: whatsappId });
            orConditions.push({ whatsappId: { contains: whatsappId } });
        }
        orConditions.push({ whatsappId: phone });
        orConditions.push({ whatsappId: { contains: phone } });

        let prospect = null;
        try {
            const dbBranch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { tenantId: true }
            });
            const tenantId = dbBranch ? dbBranch.tenantId : null;
            
            if (tenantId) {
                prospect = await prisma.prospect.findFirst({
                    where: {
                        branch: {
                            tenantId: tenantId
                        },
                        OR: orConditions
                    }
                });
            }
        } catch (err) {
            console.error("[WHATSAPP] Error fetching tenantId for prospect search:", err);
        }

        if (!prospect) {
            prospect = await prisma.prospect.findFirst({
                where: { 
                    branchId: branchId,
                    OR: orConditions
                }
            });
        }

        if (!prospect) {
            // Create a clean new prospect using realPhone
            prospect = await prisma.prospect.create({
                data: {
                    name: contactName,
                    phone: realPhone,
                    whatsappId: whatsappId || phone,
                    branchId: branchId,
                    funnelStage: 'NEW'
                }
            });
            console.log(`[WHATSAPP] Created new prospect for phone: ${realPhone}, whatsappId: ${whatsappId || phone} under branch: ${branchId}`);
        } else {
            // Update whatsappId and/or name/phone if missing
            const updates = {};
            if (whatsappId && prospect.whatsappId !== whatsappId) {
                updates.whatsappId = whatsappId;
            }
            if (realPhone && !prospect.phone) {
                updates.phone = realPhone;
            }
            if (Object.keys(updates).length > 0) {
                prospect = await prisma.prospect.update({
                    where: { id: prospect.id },
                    data: updates
                });
                console.log(`[WHATSAPP] Updated prospect ${prospect.id} with:`, updates);
            }
        }

        // Set initial status based on ACK
        let initialStatus = 0;
        if (msg.fromMe) {
            if (msg.ack === 1) initialStatus = 1;
            else if (msg.ack === 2) initialStatus = 2;
            else if (msg.ack >= 3) initialStatus = 3;
            else initialStatus = 1; // default to sent
        }

        let bodyText = msg.body || '';
        if (msg.hasMedia) {
            let mediaTag = '📎 [Archivo]';
            if (msg.type === 'image') {
                mediaTag = '📎 [Imagen]';
            } else if (msg.type === 'video') {
                mediaTag = '📎 [Video]';
            } else if (msg.type === 'audio' || msg.type === 'ptt') {
                mediaTag = '📎 [Audio]';
            } else if (msg.type === 'sticker') {
                mediaTag = '📎 [Sticker]';
            } else if (msg.type === 'document') {
                mediaTag = '📎 [Documento]';
            }
            bodyText = mediaTag + (msg.body ? ": " + msg.body : "");
        } else if (!bodyText) {
            if (msg.type === 'sticker') {
                bodyText = '📎 [Sticker]';
            } else if (msg.type === 'location') {
                bodyText = '📍 [Ubicación]';
            } else if (msg.type === 'vcard' || msg.type === 'multi_vcard') {
                bodyText = '📇 [Contacto]';
            } else if (msg.type === 'revoked') {
                bodyText = '🚫 [Mensaje eliminado]';
            } else {
                bodyText = `[Mensaje tipo: ${msg.type || 'desconocido'}]`;
            }
        }

        // If fromMe, see if there is a pending message we can link to
        let linkedPending = false;
        if (msg.fromMe) {
            const pendingMsg = await prisma.whatsAppMessage.findFirst({
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
                await prisma.whatsAppMessage.update({
                    where: { id: pendingMsg.id },
                    data: {
                        messageId: msg.id._serialized,
                        body: bodyText,
                        status: initialStatus,
                        timestamp: new Date(msg.timestamp * 1000)
                    }
                });
                console.log(`[WHATSAPP] Linked pending message ${pendingMsg.id} to real messageId: ${msg.id._serialized}`);
                linkedPending = true;
            }
        }

        if (!linkedPending) {
            await prisma.whatsAppMessage.create({
                data: {
                    messageId: msg.id._serialized,
                    prospectId: prospect.id,
                    body: bodyText,
                    isFromMe: msg.fromMe,
                    status: initialStatus,
                    timestamp: new Date(msg.timestamp * 1000)
                }
            });
            console.log(`[WHATSAPP] Message saved successfully in DB under prospect: ${prospect.name}`);
        }

        // Actualizar updatedAt del prospecto para empujar la conversación arriba al instante
        await prisma.prospect.update({
            where: { id: prospect.id },
            data: { updatedAt: new Date() }
        });
    } catch (e) {
        console.error(`[WHATSAPP] Error saving message event for branch ${branchId}:`, e);
    }
}

// Function to sync recent chats and their history to the database in two phases (Option B + Deep Background Sync)
async function syncRecentChatsHistory(branchId, client) {
    console.log(`[WHATSAPP] [Branch: ${branchId}] Starting Phase 1 Chats History Sync (top 30 chats, 50 messages each)...`);
    try {
        const chats = await client.getChats();
        console.log(`[WHATSAPP] [Branch: ${branchId}] Found ${chats.length} total chats on device.`);
        
        // Filter to standard direct message chats (excluding groups/broadcasts)
        const directChats = chats.filter(c => {
            return !c.isGroup && !c.isReadOnly && c.id && 
                   (c.id._serialized.endsWith('@c.us') || c.id._serialized.endsWith('@lid'));
        });
        
        const phase1Chats = directChats.slice(0, 30);
        console.log(`[WHATSAPP] [Branch: ${branchId}] Phase 1: Syncing top ${phase1Chats.length} direct chats.`);
        
        for (const chat of phase1Chats) {
            try {
                console.log(`[WHATSAPP] [Branch: ${branchId}] Fetching last 50 messages for chat JID: ${chat.id._serialized}`);
                const messages = await chat.fetchMessages({ limit: 50 });
                
                for (const msg of messages) {
                    try {
                        await saveWhatsAppMessage(branchId, client, msg);
                    } catch (msgErr) {
                        console.error(`[WHATSAPP] Error saving synced message ${msg.id?._serialized || 'unknown'} for branch ${branchId}:`, msgErr.message);
                    }
                }
                
                // Add a small 150ms throttle to prevent PostgreSQL Neon connection spikes
                await new Promise(resolve => setTimeout(resolve, 150));
            } catch (chatErr) {
                console.error(`[WHATSAPP] Failed to sync messages for chat ${chat.id?._serialized} under branch ${branchId}:`, chatErr.message);
            }
        }
        console.log(`[WHATSAPP] [Branch: ${branchId}] Successfully completed Phase 1 history sync.`);
        
        // Phase 2: Deep History Background Sync (100 older chats with 100 messages each)
        const phase2Chats = directChats.slice(30, 130);
        if (phase2Chats.length > 0) {
            console.log(`[WHATSAPP] [Branch: ${branchId}] Phase 2: Queued deep background sync for next ${phase2Chats.length} older chats in 5 seconds...`);
            
            setTimeout(async () => {
                console.log(`[WHATSAPP] [Branch: ${branchId}] Phase 2: Starting deep background sync for older chats...`);
                for (let i = 0; i < phase2Chats.length; i++) {
                    const chat = phase2Chats[i];
                    try {
                        console.log(`[WHATSAPP] [Branch: ${branchId}] Deep Sync [${i + 1}/${phase2Chats.length}] - Fetching last 100 messages for JID: ${chat.id._serialized}`);
                        const messages = await chat.fetchMessages({ limit: 100 });
                        
                        for (const msg of messages) {
                            try {
                                await saveWhatsAppMessage(branchId, client, msg);
                            } catch (msgErr) {
                                // Ignore save errors to keep going
                            }
                        }
                        
                        // Longer throttle (400ms) for background deep sync to keep it lightweight
                        await new Promise(resolve => setTimeout(resolve, 400));
                    } catch (chatErr) {
                        console.error(`[WHATSAPP] Deep Sync Failed for chat ${chat.id?._serialized}:`, chatErr.message);
                    }
                }
                console.log(`[WHATSAPP] [Branch: ${branchId}] Successfully completed Phase 2 deep history background sync.`);
            }, 5000);
        }
    } catch (err) {
        console.error(`[WHATSAPP] [Branch: ${branchId}] Failed to run chats history sync:`, err.message);
    }
}


// Helper to get or create a WhatsApp session by branchId
async function getSessionForBranch(originalBranchId) {
    const branchId = await getPrimaryBranchId(originalBranchId);
    let session = await prisma.whatsAppSession.findUnique({
        where: { branchId }
    });
    
    if (!session) {
        session = await prisma.whatsAppSession.create({
            data: {
                branchId,
                status: 'DISCONNECTED'
            }
        });
    }
    return session;
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
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: `br-${shortBranchId}`,
            dataPath: './.wwebjs_auth'
        }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            ],
            headless: true,
        }
    });

    clients.set(branchId, client);

    client.on('qr', async (qr) => {
        console.log(`[WHATSAPP] QR RECEIVED for branch ${branchId}`, qr);
        qrcode.generate(qr, { small: true });
        
        try {
            const session = await getSessionForBranch(branchId);
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'QR_READY',
                    sessionData: qr
                }
            });
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update QR in DB for branch ${branchId}`, e);
        }
    });

    client.on('ready', async () => {
        console.log(`[WHATSAPP] Client is ready for branch ${branchId}!`);
        try {
            const phone = client.info && client.info.wid ? client.info.wid.user : null;
            const session = await getSessionForBranch(branchId);
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'CONNECTED',
                    sessionData: phone ? JSON.stringify({ phone }) : null
                }
            });

            // Run self-healing for LID contacts in the background
            selfHealLIDProspects(branchId).catch(err => {
                console.error(`[WHATSAPP] Background self-healing failed for branch ${branchId}:`, err);
            });

            // Sync recent chats history in the background when ready
            syncRecentChatsHistory(branchId, client).catch(err => {
                console.error(`[WHATSAPP] Background history sync failed for branch ${branchId}:`, err);
            });
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update Ready status in DB for branch ${branchId}`, e);
        }
    });

    client.on('disconnected', async (reason) => {
        console.log(`[WHATSAPP] Client was disconnected for branch ${branchId}`, reason);
        clients.delete(branchId);
        try {
            const session = await getSessionForBranch(branchId);
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'DISCONNECTED',
                    sessionData: null
                }
            });
        } catch (e) {
            console.error(`[WHATSAPP] Failed to update Disconnect status in DB for branch ${branchId}`, e);
        }
    });

    const handleIncomingOrCreateMessage = async msg => {
        await saveWhatsAppMessage(branchId, client, msg);
    };

    client.on('message', handleIncomingOrCreateMessage);
    client.on('message_create', handleIncomingOrCreateMessage);

    client.on('message_ack', async (msg, ack) => {
        try {
            if (!msg.id._serialized) return;
            
            let status = 0;
            if (ack === 1) status = 1; // sent to server (1 palomita)
            else if (ack === 2) status = 2; // delivered to device (2 palomitas grises)
            else if (ack === 3 || ack === 4 || ack === 5) status = 3; // read/played (2 palomitas azules)
            
            await prisma.whatsAppMessage.updateMany({
                where: { messageId: msg.id._serialized },
                data: { status }
            });
            console.log(`[WHATSAPP] Updated message ACK for ${msg.id._serialized} to status ${status}`);
        } catch (e) {
            console.error('Error updating message ack:', e);
        }
    });

    client.initialize().catch(async err => {
        console.error(`[WHATSAPP] Initialization crash for branch ${branchId}:`, err);
        
        clients.delete(branchId);
        
        try {
            await client.destroy();
            console.log(`[WHATSAPP] Closed browser instance for branch ${branchId} after initialization crash.`);
        } catch (destroyErr) {
            console.warn(`[WHATSAPP] Failed to destroy client browser for branch ${branchId}:`, destroyErr.message);
        }

        // Wait briefly for OS lock release
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Clean folder
        const shortBranchId = branchId.split('-')[0];
        const authPath = path.resolve(process.cwd(), `./.wwebjs_auth/session-br-${shortBranchId}`);
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log(`[WHATSAPP] Cleaned up corrupt credentials folder for branch ${branchId} after initialization crash.`);
            } catch (fsErr) {
                console.error(`[WHATSAPP] Failed to clean credentials folder for branch ${branchId} after initialization crash:`, fsErr);
            }
        }

        try {
            const session = await getSessionForBranch(branchId);
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'DISCONNECTED',
                    sessionData: null
                }
            });
            console.log(`[WHATSAPP] Reset session status to DISCONNECTED in DB for branch ${branchId} after initialization crash.`);
        } catch (dbErr) {
            console.error(`[WHATSAPP] Failed to reset database session status on crash for branch ${branchId}:`, dbErr);
        }
    });

    return client;
}

app.post('/api/send', async (req, res) => {
    const { phone, message, prospectId, media, branchId } = req.body;
    
    if (!phone && !prospectId) {
        return res.status(400).json({ error: 'Phone or prospectId is required' });
    }

    try {
        let resolvedBranchId = branchId;
        if (!resolvedBranchId && prospectId) {
            const pr = await prisma.prospect.findUnique({
                where: { id: prospectId }
            });
            if (pr) {
                resolvedBranchId = pr.branchId;
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
                const branch = await prisma.branch.findUnique({
                    where: { id: resolvedBranchId },
                    select: { tenantId: true }
                });
                if (branch && branch.tenantId) {
                    const siblingBranches = await prisma.branch.findMany({
                        where: { tenantId: branch.tenantId, isActive: true },
                        select: { id: true }
                    });
                    for (const sibling of siblingBranches) {
                        const altClient = clients.get(sibling.id);
                        if (altClient && altClient.info) {
                            client = altClient;
                            console.log(`[WHATSAPP] Found alternate connected client for tenant ${branch.tenantId} under branch ${sibling.id} in /api/send. Redirecting send...`);
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
        // Check if there is an existing prospect to see if we have their LID or JID whatsappId
        if (prospectId) {
            const pr = await prisma.prospect.findUnique({
                where: { id: prospectId }
            });
            if (pr) {
                if (pr.whatsappId && pr.whatsappId !== '0') {
                    chatId = pr.whatsappId.includes('@') 
                        ? pr.whatsappId 
                        : (pr.whatsappId.length > 13 ? `${pr.whatsappId}@lid` : `${pr.whatsappId}@c.us`);
                } else if (pr.phone) {
                    let pPhone = pr.phone;
                    if (pPhone.startsWith('52') && pPhone.length === 12) {
                        pPhone = '521' + pPhone.substring(2);
                    }
                    chatId = `${pPhone}@c.us`;
                }
            }
        }

        if (!chatId && phone) {
            let pPhone = phone;
            if (pPhone.startsWith('52') && pPhone.length === 12) {
                pPhone = '521' + pPhone.substring(2);
            }
            chatId = `${pPhone}@c.us`;
        }

        if (!chatId) {
            return res.status(400).json({ error: 'Could not resolve a valid WhatsApp JID for recipient' });
        }

        let sentMsg;
        if (media && media.data && media.mimetype) {
            let base64Data = media.data;
            if (base64Data.includes(';base64,')) {
                base64Data = base64Data.split(';base64,')[1];
            }
            const mediaObj = new MessageMedia(media.mimetype, base64Data, media.filename || 'archivo');
            sentMsg = await client.sendMessage(chatId, mediaObj, message ? { caption: message } : undefined);
        } else {
            sentMsg = await client.sendMessage(chatId, message || '');
        }

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
                }
                bodyText = mediaTag + (message ? ": " + message : "");
            }

            // Check if the message was already saved (e.g. by message_create event) to avoid duplicate unique constraint crash
            const existing = await prisma.whatsAppMessage.findFirst({
                where: { messageId: sentMsg.id._serialized }
            });

            if (!existing) {
                await prisma.whatsAppMessage.create({
                    data: {
                        messageId: sentMsg.id._serialized,
                        prospectId: prospectId,
                        body: bodyText,
                        isFromMe: true,
                        status: 1, // Sent (1 tick)
                        timestamp: new Date(sentMsg.timestamp * 1000)
                    }
                });
                console.log(`[WHATSAPP] /api/send saved message ${sentMsg.id._serialized} successfully.`);
            } else {
                console.log(`[WHATSAPP] /api/send: message ${sentMsg.id._serialized} was already saved by message_create event.`);
            }

            // Actualizar updatedAt del prospecto para empujar la conversación arriba al instante
            await prisma.prospect.update({
                where: { id: prospectId },
                data: { updatedAt: new Date() }
            });
        }

        res.json({ success: true, messageId: sentMsg.id._serialized });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
});

// Express GET endpoint to retrieve and download media on-demand
app.get('/api/media/:messageId', async (req, res) => {
    const { messageId } = req.params;
    try {
        // Find the message in DB to get prospect JID/phone
        const dbMsg = await prisma.whatsAppMessage.findFirst({
            where: {
                OR: [
                    { messageId: messageId },
                    { id: messageId }
                ]
            }
        });

        if (!dbMsg) {
            return res.status(404).json({ error: 'Message not found in database' });
        }

        const activeMessageId = dbMsg.messageId || messageId;

        const prospect = await prisma.prospect.findUnique({
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

        let phone = prospect.phone;
        if (!phone) {
            return res.status(400).json({ error: 'Prospect has no phone number' });
        }

        if (phone.startsWith('52') && phone.length === 12) {
            phone = '521' + phone.substring(2);
        }

        let chatId = prospect.whatsappId ? (prospect.whatsappId.includes('@') ? prospect.whatsappId : (prospect.whatsappId.length > 13 ? `${prospect.whatsappId}@lid` : `${prospect.whatsappId}@c.us`)) : `${phone}@c.us`;

        console.log(`[WHATSAPP] Fetching media for message ${activeMessageId} in chat ${chatId} using client for branch ${branchId}`);

        const chat = await client.getChatById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const messages = await chat.fetchMessages({ limit: 100 });
        let msg = messages.find(m => m.id._serialized === activeMessageId);

        if (!msg) {
            console.log(`[WHATSAPP] Message not found in last 100 messages, trying client.getMessageById`);
            try {
                msg = await client.getMessageById(activeMessageId);
            } catch (err) {
                console.warn('[WHATSAPP] client.getMessageById failed:', err.message);
            }
        }

        if (!msg) {
            return res.status(404).json({ error: 'Message not found on WhatsApp Web client' });
        }

        if (!msg.hasMedia) {
            return res.status(400).json({ error: 'Message does not contain media' });
        }

        const media = await msg.downloadMedia();
        if (!media) {
            return res.status(500).json({ error: 'Failed to download media from WhatsApp CDN' });
        }

        res.json({
            mimetype: media.mimetype,
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
    const { branchId } = req.body;
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

        // Reset database session status
        try {
            const session = await getSessionForBranch(resolvedBranchId);
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'DISCONNECTED',
                    sessionData: null
                }
            });
            console.log(`[WHATSAPP] Session status updated to DISCONNECTED in DB for branch ${resolvedBranchId}.`);
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

        const prospects = await prisma.prospect.findMany({
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
                    const existingProspect = await prisma.prospect.findFirst({
                        where: {
                            phone: realPhone,
                            branchId: p.branchId,
                            id: { not: p.id }
                        }
                    });

                    if (existingProspect) {
                        console.log(`[WHATSAPP] Duplicate prospect found with phone ${realPhone}. Merging prospect ${p.id} into ${existingProspect.id}`);
                        
                        await prisma.whatsAppMessage.updateMany({
                            where: { prospectId: p.id },
                            data: { prospectId: existingProspect.id }
                        });

                        if (!existingProspect.whatsappId) {
                            await prisma.prospect.update({
                                where: { id: existingProspect.id },
                                data: { whatsappId: originalLid }
                            });
                        }

                        await prisma.prospect.delete({
                            where: { id: p.id }
                        });
                        
                        console.log(`[WHATSAPP] Successfully merged prospect ${p.name} into ${existingProspect.name}.`);

                        const resetResult = await prisma.whatsAppMessage.updateMany({
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
                        await prisma.prospect.update({
                            where: { id: p.id },
                            data: {
                                phone: realPhone,
                                whatsappId: originalLid
                            }
                        });

                        const resetResult = await prisma.whatsAppMessage.updateMany({
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

// Polling function to process pending media requests
let isMediaPolling = false;

setInterval(async () => {
    if (isMediaPolling) return;

    try {
        isMediaPolling = true;

        const pendingRequests = await prisma.whatsAppMediaRequest.findMany({
            where: { status: 'PENDING' }
        });

        for (const req of pendingRequests) {
            console.log(`[MEDIA POLL] Processing media request for message ${req.messageId}`);
            try {
                // Find the message in DB to get prospect
                const dbMsg = await prisma.whatsAppMessage.findFirst({
                    where: {
                        OR: [
                            { messageId: req.messageId },
                            { id: req.messageId }
                        ]
                    }
                });

                if (!dbMsg) {
                    console.error(`[MEDIA POLL] Message ${req.messageId} not found in DB`);
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                const activeMessageId = dbMsg.messageId || req.messageId;

                const prospect = await prisma.prospect.findUnique({
                    where: { id: dbMsg.prospectId }
                });

                if (!prospect || !prospect.branchId) {
                    console.error(`[MEDIA POLL] Prospect not found or has no branch for message ${req.messageId}`);
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                const branchId = prospect.branchId;
                let client = clients.get(branchId);

                // Fallback check: find any connected sibling client under the same tenant
                if (!client || !client.info) {
                    const branch = await prisma.branch.findUnique({
                        where: { id: branchId },
                        select: { tenantId: true }
                    });
                    if (branch && branch.tenantId) {
                        const tenantBranches = await prisma.branch.findMany({
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
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                let phone = prospect.phone;
                if (!phone) {
                    console.error(`[MEDIA POLL] Prospect has no phone for message ${req.messageId}`);
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                if (phone.startsWith('52') && phone.length === 12) {
                    phone = '521' + phone.substring(2);
                }

                let chatId = prospect.whatsappId ? (prospect.whatsappId.includes('@') ? prospect.whatsappId : (prospect.whatsappId.length > 13 ? `${prospect.whatsappId}@lid` : `${prospect.whatsappId}@c.us`)) : `${phone}@c.us`;

                console.log(`[MEDIA POLL] Fetching chat ${chatId} using client info: ${client.info.wid.user}`);
                const chat = await client.getChatById(chatId);
                if (!chat) {
                    console.error(`[MEDIA POLL] Chat not found for message ${req.messageId}`);
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                const messages = await chat.fetchMessages({ limit: 100 });
                let msg = messages.find(m => m.id._serialized === activeMessageId);

                if (!msg) {
                    console.log(`[MEDIA POLL] Message not found in last 100, trying client.getMessageById`);
                    try {
                        msg = await client.getMessageById(activeMessageId);
                    } catch (err) {
                        console.warn('[MEDIA POLL] client.getMessageById failed:', err.message);
                    }
                }

                if (!msg || !msg.hasMedia) {
                    console.error(`[MEDIA POLL] Message not found on WA or has no media`);
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                const media = await msg.downloadMedia();
                if (!media) {
                    console.error(`[MEDIA POLL] Failed downloadMedia() from WA CDN`);
                    await prisma.whatsAppMediaRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                // Update the media request to COMPLETED with base64 data!
                await prisma.whatsAppMediaRequest.update({
                    where: { id: req.id },
                    data: {
                        status: 'COMPLETED',
                        mimetype: media.mimetype,
                        filename: media.filename || 'archivo',
                        data: media.data
                    }
                });
                console.log(`[MEDIA POLL] Successfully completed media request for message ${req.messageId}`);

            } catch (err) {
                console.error(`[MEDIA POLL] Error processing media request ${req.messageId}:`, err);
                await prisma.whatsAppMediaRequest.update({
                    where: { id: req.id },
                    data: { status: 'FAILED' }
                }).catch(() => {});
            }
        }

    } catch (err) {
        console.error("[MEDIA POLL] Error in pollMediaRequests:", err);
    } finally {
        isMediaPolling = false;
    }
}, 2000);

// Polling function to process pending sync requests
let isSyncPolling = false;

setInterval(async () => {
    if (isSyncPolling) return;

    try {
        isSyncPolling = true;

        const pendingSyncRequests = await prisma.whatsAppSyncRequest.findMany({
            where: { status: 'PENDING' }
        });

        for (const req of pendingSyncRequests) {
            try {
                const resolvedBranchId = await getPrimaryBranchId(req.branchId);
                console.log(`[SYNC POLL] Processing sync request for branch ${req.branchId} (Resolved: ${resolvedBranchId})`);
                
                let client = clients.get(resolvedBranchId);

                const isInitializing = clients.has(resolvedBranchId) && (!client || !client.info);

                if (!client || !client.info) {
                    if (isInitializing) {
                        console.log(`[SYNC POLL] WhatsApp client for branch ${resolvedBranchId} (Request: ${req.branchId}) is still initializing. Postponing sync request...`);
                        continue;
                    }

                    console.error(`[SYNC POLL] No active WhatsApp client found for branch/tenant ${resolvedBranchId} (Request: ${req.branchId})`);
                    await prisma.whatsAppSyncRequest.update({
                        where: { id: req.id },
                        data: { status: 'FAILED' }
                    });
                    continue;
                }

                // Run Phase 1 sync: top 30 chats and 50 messages each
                console.log(`[SYNC POLL] Starting historical sync for branch ${resolvedBranchId} (Request: ${req.branchId})`);
                await syncRecentChatsHistory(resolvedBranchId, client);

                // Mark the sync request as COMPLETED
                await prisma.whatsAppSyncRequest.update({
                    where: { id: req.id },
                    data: { status: 'COMPLETED' }
                });
                console.log(`[SYNC POLL] Successfully completed sync request for branch ${resolvedBranchId} (Request: ${req.branchId})`);

            } catch (err) {
                console.error(`[SYNC POLL] Error processing sync request for branch ${req.branchId}:`, err);
                await prisma.whatsAppSyncRequest.update({
                    where: { id: req.id },
                    data: { status: 'FAILED' }
                }).catch(() => {});
            }
        }

    } catch (err) {
        console.error("[SYNC POLL] Error in pollSyncRequests:", err);
    } finally {
        isSyncPolling = false;
    }
}, 2000);

// Polling function to send pending messages
let isPolling = false;

setInterval(async () => {
    if (isPolling) return;

    try {
        isPolling = true;

        const pendingMessages = await prisma.whatsAppMessage.findMany({
            where: {
                messageId: null,
                isFromMe: true
            },
            include: {
                prospect: true
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        for (const msg of pendingMessages) {
            // Verify it wasn't deleted or sent in the meantime
            const stillPending = await prisma.whatsAppMessage.findUnique({
                where: { id: msg.id }
            });
            if (!stillPending || stillPending.messageId) continue;

            const branchId = msg.prospect.branchId;
            const resolvedBranchId = await getPrimaryBranchId(branchId);
            let client = clients.get(resolvedBranchId);
            
            if (!client || !client.info) {
                console.log(`[WHATSAPP] Client not connected or ready for branch ${resolvedBranchId} (Request: ${branchId}), skipping pending message.`);
                continue;
            }

            try {
                let phone = msg.prospect.phone;
                let chatId = null;

                if (msg.prospect.whatsappId && msg.prospect.whatsappId !== '0') {
                    chatId = msg.prospect.whatsappId.includes('@')
                        ? msg.prospect.whatsappId
                        : (msg.prospect.whatsappId.length > 13 ? `${msg.prospect.whatsappId}@lid` : `${msg.prospect.whatsappId}@c.us`);
                } else if (phone) {
                    let pPhone = phone;
                    if (pPhone.startsWith('52') && pPhone.length === 12) {
                        pPhone = '521' + pPhone.substring(2);
                    }
                    chatId = `${pPhone}@c.us`;
                }

                if (!chatId) continue;

                let sentMsg = null;
                try {
                    sentMsg = await client.sendMessage(chatId, msg.body);

                    // Resolve JID asynchronously after sending if it was not resolved yet
                    if (!msg.prospect.whatsappId || msg.prospect.whatsappId === '0') {
                        const resolvedJid = sentMsg.to || chatId;
                        const whatsappIdUser = resolvedJid.split('@')[0];
                        prisma.prospect.update({
                            where: { id: msg.prospect.id },
                            data: { whatsappId: whatsappIdUser }
                        }).catch(e => console.error(`[WHATSAPP] Failed to update JID after send:`, e.message));
                    }
                } catch (sendError) {
                    console.error(`Failed to send pending message to ${msg.prospect?.phone}:`, sendError);
                    await prisma.whatsAppMessage.update({
                        where: { id: msg.id },
                        data: {
                            messageId: 'FAILED_' + Date.now()
                        }
                    }).catch(() => {});
                    continue;
                }

                // Safe update: isolate database transaction from actual sending
                try {
                    const checkAgain = await prisma.whatsAppMessage.findUnique({
                        where: { id: msg.id }
                    });

                    if (checkAgain && (checkAgain.messageId === null || checkAgain.messageId.startsWith('FAILED_'))) {
                        await prisma.whatsAppMessage.update({
                            where: { id: msg.id },
                            data: {
                                messageId: sentMsg.id._serialized,
                                timestamp: new Date(sentMsg.timestamp * 1000)
                            }
                        });
                        console.log(`[WHATSAPP] Polling loop updated message ${msg.id} to messageId ${sentMsg.id._serialized}`);
                    } else {
                        console.log(`[WHATSAPP] Polling loop: Message ${msg.id} was already updated/linked by message_create.`);
                    }
                } catch (dbErr) {
                    console.warn(`[WHATSAPP] Safe database link warning (soft unique constraint handled):`, dbErr.message);
                }
                
                console.log(`[WHATSAPP] Sent pending message to ${phone}`);

                // Wait 1.5 seconds between messages in the same batch to avoid spam
                if (pendingMessages.indexOf(msg) < pendingMessages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            } catch (loopErr) {
                console.error(`[WHATSAPP] Polling loop exception:`, loopErr);
            }
        }
    } catch (error) {
        console.error('Error polling for pending messages:', error);
    } finally {
        isPolling = false;
    }
}, 1000);

async function initializeAllActiveSessions() {
    console.log('[WHATSAPP] Pre-initializing connected/active sessions...');
    try {
        const sessions = await prisma.whatsAppSession.findMany({
            where: {
                status: { in: ['CONNECTED', 'QR_READY'] }
            }
        });
        
        console.log(`[WHATSAPP] Found ${sessions.length} sessions to pre-initialize.`);
        for (const session of sessions) {
            console.log(`[WHATSAPP] Pre-initializing branch ${session.branchId}...`);
            getClientForBranch(session.branchId).catch(err => {
                console.error(`[WHATSAPP] Failed to pre-initialize branch ${session.branchId}:`, err);
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

        // 1. Process LOGGING_OUT sessions
        const loggingOutSessions = await prisma.whatsAppSession.findMany({
            where: { status: 'LOGGING_OUT' }
        });

        for (const session of loggingOutSessions) {
            const branchId = session.branchId;
            const resolvedBranchId = await getPrimaryBranchId(branchId);
            if (resolvedBranchId !== branchId) {
                console.warn(`[POLLING] Found LOGGING_OUT session for sibling branch ${branchId}. Deleting duplicate record.`);
                await prisma.whatsAppSession.delete({ where: { id: session.id } }).catch(() => {});
                continue;
            }

            console.log(`[POLLING] Found LOGGING_OUT session for branch ${branchId}. Disconnecting client...`);
            
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

            // Set state to INITIALIZING in DB
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'INITIALIZING',
                    sessionData: null
                }
            });

            // Recreate client immediately
            console.log(`[POLLING] Re-initializing fresh client for branch ${branchId}...`);
            await getClientForBranch(branchId, true);
        }

        // 2. Process INITIALIZING sessions that do not have an active client in memory
        const initializingSessions = await prisma.whatsAppSession.findMany({
            where: { status: 'INITIALIZING' }
        });

        for (const session of initializingSessions) {
            const branchId = session.branchId;
            const resolvedBranchId = await getPrimaryBranchId(branchId);
            if (resolvedBranchId !== branchId) {
                console.warn(`[POLLING] Found INITIALIZING session for sibling branch ${branchId}. Deleting duplicate record.`);
                await prisma.whatsAppSession.delete({ where: { id: session.id } }).catch(() => {});
                continue;
            }

            if (!clients.has(branchId)) {
                console.log(`[POLLING] Found INITIALIZING session for branch ${branchId} without active client. Spawning...`);
                await getClientForBranch(branchId, true);
            }
        }

        // 3. Auto-resume CONNECTED/QR_READY sessions that do not have an active client in memory (e.g. service restart)
        const activeSessions = await prisma.whatsAppSession.findMany({
            where: { status: { in: ['CONNECTED', 'QR_READY'] } }
        });

        for (const session of activeSessions) {
            const branchId = session.branchId;
            const resolvedBranchId = await getPrimaryBranchId(branchId);
            if (resolvedBranchId !== branchId) {
                console.warn(`[POLLING] Found active/ready session for sibling branch ${branchId}. Deleting duplicate record.`);
                await prisma.whatsAppSession.delete({ where: { id: session.id } }).catch(() => {});
                continue;
            }

            if (!clients.has(branchId)) {
                console.log(`[POLLING] Found active/ready session for branch ${branchId} but no client in memory. Resuming client...`);
                await getClientForBranch(branchId, false);
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