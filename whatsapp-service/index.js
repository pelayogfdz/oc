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

// Initialize WhatsApp Client with local auth so session persists
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
    }
});

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

client.on('qr', async (qr) => {
    console.log('QR RECEIVED', qr);
    // Print in terminal for debug
    qrcode.generate(qr, { small: true });
    
    try {
        const session = await getGlobalSession();
        await prisma.whatsAppSession.update({
            where: { id: session.id },
            data: {
                status: 'QR_READY',
                sessionData: qr // Store the raw QR string so Next.js can display it using qrcode.react
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

client.on('message', async msg => {
    // Ignore status broadcasts
    if (msg.isStatus) return;

    const contact = await msg.getContact();
    let phone = contact.number; // e.g. "5215555555555"

    console.log(`[WHATSAPP] Contact Info:`, {
        id: contact.id,
        number: contact.number,
        pushname: contact.pushname,
        name: contact.name,
        shortName: contact.shortName
    });

    console.log(`[WHATSAPP] Mensaje recibido de ${phone}: ${msg.body}`);

    try {
        const branch = await prisma.branch.findFirst();
        if (!branch) return;

        // Find or create prospect
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
            prospect = await prisma.prospect.create({
                data: {
                    name: contact.pushname || contact.name || phone,
                    phone: phone,
                    branchId: branch.id,
                    funnelStage: 'NEW'
                }
            });
        }

        // Save message
        await prisma.whatsAppMessage.create({
            data: {
                messageId: msg.id._serialized,
                prospectId: prospect.id,
                body: msg.body,
                isFromMe: false,
                timestamp: new Date(msg.timestamp * 1000)
            }
        });

    } catch (e) {
        console.error('Error saving incoming message:', e);
    }
});

client.on('message_ack', async (msg, ack) => {
    /*
        ACK values:
        0: ACK_ERROR
        1: ACK_PENDING
        2: ACK_SERVER (Sent)
        3: ACK_DEVICE (Delivered/Received)
        4: ACK_READ (Read - blue ticks)
        5: ACK_PLAYED
    */
    try {
        if (!msg.id._serialized) return;
        
        let status = 0;
        if (ack === 1) status = 0; // sending
        else if (ack === 2) status = 1; // sent (1 tick)
        else if (ack === 3) status = 2; // delivered (2 ticks)
        else if (ack === 4 || ack === 5) status = 3; // read (blue ticks)
        
        await prisma.whatsAppMessage.updateMany({
            where: { messageId: msg.id._serialized },
            data: { status }
        });
    } catch (e) {
        console.error('Error updating message ack:', e);
    }
});

app.post('/api/send', async (req, res) => {
    const { phone, message, prospectId } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    try {
        // Send message via whatsapp-web.js
        // For standard formatting, it needs '@c.us' appended
        const chatId = `${phone}@c.us`; 
        const sentMsg = await client.sendMessage(chatId, message);

        // Save our sent message to DB
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

// Express API to logout and disconnect WhatsApp
app.post('/api/logout', async (req, res) => {
    try {
        await client.logout();
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Start Express Server
const PORT = process.env.WHATSAPP_PORT || 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp Microservice API running on port ${PORT}`);
    // Start WhatsApp Client
    client.initialize();
});

// Polling function to send pending messages
setInterval(async () => {
    if (!client.info) return; // Client not ready

    try {
        // Find pending messages (messageId is null, but isFromMe is true)
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

                // Format Mexican phone numbers: if it starts with 52 and has 12 digits, insert 1
                if (phone.startsWith('52') && phone.length === 12) {
                    phone = '521' + phone.substring(2);
                }

                let chatId = `${phone}@c.us`;

                // Try to validate, but fallback if it throws 'No LID'
                try {
                    const numberId = await client.getNumberId(phone);
                    if (numberId) {
                        chatId = numberId._serialized;
                        
                        // Update whatsappId if not set or different
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

                // Update the message with the real messageId
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
                // Mark as failed so it doesn't get stuck
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
}, 5000); // Poll every 5 seconds
