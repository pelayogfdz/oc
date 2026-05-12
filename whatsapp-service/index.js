const { Client, LocalAuth } = require('whatsapp-web.js');
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');

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
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
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
        const session = await getGlobalSession();
        await prisma.whatsAppSession.update({
            where: { id: session.id },
            data: {
                status: 'CONNECTED',
                sessionData: null
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
    const phone = contact.number; // e.g. "5215555555555"

    try {
        const branch = await prisma.branch.findFirst();
        if (!branch) return;

        // Find or create prospect
        let prospect = await prisma.prospect.findUnique({
            where: { phone_branchId: { phone: phone, branchId: branch.id } }
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

// Express API to send messages from Next.js
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

// Start Express Server
const PORT = process.env.WHATSAPP_PORT || 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp Microservice API running on port ${PORT}`);
    // Start WhatsApp Client
    client.initialize();
});
