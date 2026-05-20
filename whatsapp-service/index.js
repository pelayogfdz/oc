const { Client, LocalAuth } = require('whatsapp-web.js');
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

// Reusable Client variable
let client = null;

// Helper to get or create the global WhatsApp session
async function getGlobalSession() {
    // Try to find the branch matching WHATSAPP_BRANCH_ID first,
    // otherwise fallback to the first branch that has a tenantId (active company).
    // If still not found, fallback to the very first branch.
    let branch = null;
    if (process.env.WHATSAPP_BRANCH_ID) {
        branch = await prisma.branch.findUnique({
            where: { id: process.env.WHATSAPP_BRANCH_ID }
        });
    }
    if (!branch) {
        branch = await prisma.branch.findFirst({
            where: { tenantId: { not: null } }
        });
    }
    if (!branch) {
        branch = await prisma.branch.findFirst();
    }
    
    if (!branch) {
        throw new Error('No branch exists in the DB to attach the session to.');
    }
    
    let session = await prisma.whatsAppSession.findUnique({
        where: { branchId: branch.id }
    });
    
    if (!session) {
        session = await prisma.whatsAppSession.create({
            data: {
                branchId: branch.id,
                status: 'DISCONNECTED'
            }
        });
    }
    return session;
}

// Function to initialize or re-initialize client
function initializeClient() {
    console.log('[WHATSAPP] Initializing a new WhatsApp Client...');
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        }
    });

    client.on('qr', async (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.generate(qr, { small: true });
        
        try {
            const session = await getGlobalSession();
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'QR_READY',
                    sessionData: qr
                }
            });
        } catch (e) {
            console.error('Failed to update QR in DB', e);
        }
    });

    client.on('ready', async () => {
        console.log('WhatsApp Client is ready!');
        try {
            const phone = client.info && client.info.wid ? client.info.wid.user : null;
            const session = await getGlobalSession();
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'CONNECTED',
                    sessionData: phone ? JSON.stringify({ phone }) : null
                }
            });
        } catch (e) {
            console.error('Failed to update Ready status in DB', e);
        }
    });

    client.on('disconnected', async (reason) => {
        console.log('WhatsApp Client was disconnected', reason);
        try {
            const session = await getGlobalSession();
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'DISCONNECTED',
                    sessionData: null
                }
            });
        } catch (e) {
            console.error('Failed to update Disconnect status in DB', e);
        }
    });

    client.on('message_create', async msg => {
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
            console.error('[WHATSAPP] Error checking duplicate message:', dbErr);
        }

        console.log(`[WHATSAPP] Message create event - fromMe: ${msg.fromMe}, otherParty: ${phone}, body: ${msg.body}`);

        try {
            // Use the branch associated with the current WhatsApp session
            const session = await getGlobalSession();
            const branchId = session.branchId;

            // Fetch contact and normalize phone numbers
            let realPhone = phone;
            let whatsappId = null;
            let contactName = phone;

            try {
                const contact = await client.getContactById(otherPartyJid);
                contactName = contact.pushname || contact.name || phone;
                if (contact.number) {
                    realPhone = contact.number;
                }
                if (otherPartyJid.endsWith('@lid')) {
                    whatsappId = phone; // LID JID user
                }
            } catch (contactErr) {
                console.warn('[WHATSAPP] Failed to fetch contact info:', contactErr.message);
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

            let prospect = await prisma.prospect.findFirst({
                where: { 
                    branchId: branchId,
                    OR: orConditions
                }
            });

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
                console.log(`[WHATSAPP] Created new prospect for phone: ${realPhone}, whatsappId: ${whatsappId || phone}`);
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

            await prisma.whatsAppMessage.create({
                data: {
                    messageId: msg.id._serialized,
                    prospectId: prospect.id,
                    body: msg.body,
                    isFromMe: msg.fromMe,
                    status: initialStatus,
                    timestamp: new Date(msg.timestamp * 1000)
                }
            });

            console.log(`[WHATSAPP] Message saved successfully in DB under prospect: ${prospect.name}`);
        } catch (e) {
            console.error('Error saving message create event:', e);
        }
    });

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

    client.initialize().catch(err => {
        console.error('[WHATSAPP] Initialization crash:', err);
    });
}

app.post('/api/send', async (req, res) => {
    const { phone, message, prospectId } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    try {
        if (!client) {
            return res.status(503).json({ error: 'WhatsApp client is not initialized' });
        }
        
        let chatId = `${phone}@c.us`;
        // Check if there is an existing prospect to see if we have their LID whatsappId
        if (prospectId) {
            const pr = await prisma.prospect.findUnique({
                where: { id: prospectId }
            });
            if (pr && pr.whatsappId) {
                if (pr.whatsappId.includes('@')) {
                    chatId = pr.whatsappId;
                } else {
                    // Try to guess JID format (LID or classic)
                    chatId = pr.whatsappId.length > 13 ? `${pr.whatsappId}@lid` : `${pr.whatsappId}@c.us`;
                }
            }
        }

        const sentMsg = await client.sendMessage(chatId, message);

        if (prospectId) {
            await prisma.whatsAppMessage.create({
                data: {
                    messageId: sentMsg.id._serialized,
                    prospectId: prospectId,
                    body: message,
                    isFromMe: true,
                    status: 1, // Sent (1 tick)
                    timestamp: new Date(sentMsg.timestamp * 1000)
                }
            });
        }

        res.json({ success: true, messageId: sentMsg.id._serialized });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Express API to logout, clean credentials and immediately initialize a new code QR scanner
app.post('/api/logout', async (req, res) => {
    try {
        console.log('[WHATSAPP] Logout request received. Disconnecting client...');
        if (client) {
            try {
                await client.logout();
            } catch (err) {
                console.warn('[WHATSAPP] client.logout() failed (expected if not logged in):', err.message);
            }
            try {
                await client.destroy();
            } catch (err) {
                console.warn('[WHATSAPP] client.destroy() failed:', err.message);
            }
        }

        // Clean credentials
        const authPath = path.resolve(__dirname, './.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('[WHATSAPP] Credentials folder .wwebjs_auth deleted successfully.');
            } catch (fsErr) {
                console.error('[WHATSAPP] Failed to delete .wwebjs_auth folder:', fsErr);
            }
        }

        // Reset database session status
        try {
            const session = await getGlobalSession();
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: {
                    status: 'DISCONNECTED',
                    sessionData: null
                }
            });
            console.log('[WHATSAPP] Session status updated to DISCONNECTED in DB.');
        } catch (dbErr) {
            console.error('[WHATSAPP] Failed to reset database session status:', dbErr);
        }

        // Boot a brand new client scanning instance immediately
        initializeClient();

        res.json({ success: true });
    } catch (error) {
        console.error('[WHATSAPP] Logout error:', error);
        res.status(500).json({ error: 'Failed to complete logout and reinitialization' });
    }
});

const PORT = process.env.WHATSAPP_PORT || 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp Microservice API running on port ${PORT}`);
    // Start WhatsApp Client
    initializeClient();
});

// Polling function to send pending messages
setInterval(async () => {
    if (!client || !client.info) return;

    try {
        const pendingMessages = await prisma.whatsAppMessage.findMany({
            where: {
                messageId: null,
                isFromMe: true
            },
            include: {
                prospect: true
            }
        });

        for (const msg of pendingMessages) {
            try {
                let phone = msg.prospect.phone;
                if (!phone) continue;

                if (phone.startsWith('52') && phone.length === 12) {
                    phone = '521' + phone.substring(2);
                }

                let chatId = `${phone}@c.us`;

                try {
                    const numberId = await client.getNumberId(phone);
                    if (numberId) {
                        chatId = numberId._serialized;
                        
                        if (msg.prospect.whatsappId !== numberId.user) {
                            await prisma.prospect.update({
                                where: { id: msg.prospect.id },
                                data: { whatsappId: numberId.user }
                            });
                        }
                    }
                } catch (e) {
                    console.log(`[WHATSAPP] getNumberId failed for ${phone}, falling back to default format.`);
                }

                const sentMsg = await client.sendMessage(chatId, msg.body);

                await prisma.whatsAppMessage.update({
                    where: { id: msg.id },
                    data: {
                        messageId: sentMsg.id._serialized,
                        timestamp: new Date(sentMsg.timestamp * 1000)
                    }
                });
                
                console.log(`[WHATSAPP] Sent pending message to ${phone}`);
            } catch (sendError) {
                console.error(`Failed to send pending message to ${msg.prospect?.phone}:`, sendError);
                await prisma.whatsAppMessage.update({
                    where: { id: msg.id },
                    data: {
                        messageId: 'FAILED_' + Date.now()
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error polling for pending messages:', error);
    }
}, 5000);