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
    // We assume the first branch is the default one for the global session
    const branch = await prisma.branch.findFirst();
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
        if (!otherPartyJid || !otherPartyJid.endsWith('@c.us')) return; // ignore groups, broadcast, status

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
            const branch = await prisma.branch.findFirst();
            if (!branch) return;

            let prospect = await prisma.prospect.findFirst({
                where: { 
                    branchId: branch.id,
                    OR: [
                        { phone: phone },
                        { whatsappId: phone },
                        { whatsappId: { contains: phone } }
                    ]
                }
            });

            if (!prospect) {
                // Fetch contact name if possible
                let name = phone;
                try {
                    const contact = await client.getContactById(otherPartyJid);
                    name = contact.pushname || contact.name || phone;
                } catch (contactErr) {
                    console.warn('[WHATSAPP] Failed to fetch contact info:', contactErr.message);
                }

                prospect = await prisma.prospect.create({
                    data: {
                        name: name,
                        phone: phone,
                        branchId: branch.id,
                        funnelStage: 'NEW'
                    }
                });
            }

            await prisma.whatsAppMessage.create({
                data: {
                    messageId: msg.id._serialized,
                    prospectId: prospect.id,
                    body: msg.body,
                    isFromMe: msg.fromMe,
                    timestamp: new Date(msg.timestamp * 1000)
                }
            });

            console.log(`[WHATSAPP] Message saved successfully in DB.`);
        } catch (e) {
            console.error('Error saving message create event:', e);
        }
    });

    client.on('message_ack', async (msg, ack) => {
        try {
            if (!msg.id._serialized) return;
            
            let status = 0;
            if (ack === 1) status = 0;
            else if (ack === 2) status = 1;
            else if (ack === 3) status = 2;
            else if (ack === 4 || ack === 5) status = 3;
            
            await prisma.whatsAppMessage.updateMany({
                where: { messageId: msg.id._serialized },
                data: { status }
            });
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
        const chatId = `${phone}@c.us`; 
        const sentMsg = await client.sendMessage(chatId, message);

        if (prospectId) {
            await prisma.whatsAppMessage.create({
                data: {
                    messageId: sentMsg.id._serialized,
                    prospectId: prospectId,
                    body: message,
                    isFromMe: true,
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