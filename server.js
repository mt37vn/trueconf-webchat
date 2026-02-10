const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const trueconf = require('./trueconf');
const mailer = require('./mailer');
require('dotenv').config();

const app = express();

// Security: Enable trust proxy for Render.com (load balancer)
app.set('trust proxy', 1);

// Security: Enable CORS for specific origin
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
};
app.use(cors(corsOptions));
app.use(express.json()); // Handle JSON bodies for contact form

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const BOT_USER = process.env.BOT_USER;
const STAFF_USER = process.env.STAFF_USER;

// Validate environment variables
const requiredEnv = ['TRUECONF_SERVER', 'CLIENT_ID', 'CLIENT_SECRET', 'BOT_USER', 'STAFF_USER'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

function log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, Object.keys(metadata).length ? metadata : '');
}

// Store active browser connections and their associated TrueConf chats
const socketToChat = new Map(); // socketId -> chatId
const chatToSocket = new Map(); // chatId -> socketId
const clients = new Map();      // socketId -> ws object
const socketToMeta = new Map();   // socketId -> { name, phone, site }

// Serve static files (widget.js, widget.css)
app.use(express.static(path.join(__dirname, 'public')));

// Contact Form API Endpoint
const contactLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: { error: 'Too many requests, please try again later.' }
});

app.post('/api/contact', contactLimit, async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    log('info', `Received contact form from ${name} (${email})`);

    try {
        const result = await mailer.sendContactEmail(req.body);
        if (result.success) {
            res.status(200).json({ message: 'Message sent successfully.' });
        } else {
            res.status(500).json({ error: 'Failed to send message.', details: result.error });
        }
    } catch (err) {
        log('error', 'Unexpected error in contact API', { error: err.message });
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// WebSocket handling for browser clients
wss.on('connection', async (ws) => {
    const socketId = `user_${Math.random().toString(36).substr(2, 9)}`;
    log('info', `New browser client connected: ${socketId}`);

    clients.set(socketId, ws);

    // We no longer create the chat immediately. 
    // We wait for the 'init' message from the client with their name and phone.

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'init') {
                const { name, phone, site } = message;
                log('info', `Initializing session for ${socketId} (${name}, ${phone}, ${site})`);

                try {
                    const chatTitle = `${name} - ${phone}`;
                    log('info', `Creating TrueConf group chat: ${chatTitle}`);

                    const chatData = await trueconf.createGroupChat(chatTitle);
                    const chatId = chatData.chatId;

                    if (!chatId) throw new Error('No chatId returned');

                    socketToChat.set(socketId, chatId);
                    chatToSocket.set(chatId, socketId);
                    socketToMeta.set(socketId, { name, phone, site });

                    // Invite staff
                    const staffList = STAFF_USER.split(',').map(id => id.trim()).filter(id => id);
                    for (const staffId of staffList) {
                        try {
                            await trueconf.addChatParticipant(chatId, staffId);
                        } catch (e) {
                            log('warn', `Failed to invite ${staffId}`);
                        }
                    }

                    // Send detailed system introduction to TrueConf
                    const introMessage = `🔔 *New Support Request*\n\n👤 *Name:* ${name}\n📞 *Phone:* ${phone}\n🌐 *Website:* ${site}`;
                    await trueconf.sendMessage(chatId, introMessage);

                    ws.send(JSON.stringify({ type: 'system', text: `Welcome ${name}! Private session started.` }));
                    log('info', `Session initialized for ${socketId} -> ${chatId}`);
                } catch (err) {
                    log('error', `Failed to init chat for ${socketId}`, { error: err.message });
                    ws.send(JSON.stringify({ type: 'error', text: 'Failed to start session. Please try again.' }));
                }
            } else if (message.type === 'chat') {
                const chatId = socketToChat.get(socketId);
                if (!chatId) {
                    log('error', `No chatId found for socket ${socketId}`);
                    return;
                }

                log('info', `Message from ${socketId} to chat ${chatId}`, { text: message.text });

                try {
                    const meta = socketToMeta.get(socketId);
                    const prefix = meta ? `${meta.name}: ` : '';
                    await trueconf.sendMessage(chatId, prefix + message.text);
                } catch (err) {
                    log('error', `Failed to send message to TrueConf chat ${chatId}`, { error: err.message });
                    ws.send(JSON.stringify({ type: 'error', text: 'Failed to send message' }));
                }
            }
        } catch (err) {
            log('error', `Error processing browser message from ${socketId}`, { error: err.message });
        }
    });

    ws.on('close', () => {
        const chatId = socketToChat.get(socketId);
        log('info', `Browser client disconnected: ${socketId} (Chat: ${chatId})`);

        // Cleanup mappings
        if (chatId) {
            chatToSocket.delete(chatId);
        }
        socketToChat.delete(socketId);
        clients.delete(socketId);
        socketToMeta.delete(socketId);
    });
});

// Handle incoming messages from TrueConf
trueconf.onChatMessage = (payload) => {
    // payload structure: { chatId, author: {id, type}, content: {text, parseMode}, ... }
    const chatId = payload.chatId;
    const senderId = payload.author ? payload.author.id : null;
    const textMessage = payload.content ? payload.content.text : null;

    if (senderId === BOT_USER || !textMessage) return;

    // Route back to the correct browser socket using the chatId mapping
    const targetSocketId = chatToSocket.get(chatId);

    if (targetSocketId) {
        const client = clients.get(targetSocketId);
        if (client) {
            log('info', `Routing message from TrueConf chat ${chatId} to browser client ${targetSocketId}`);

            // Extract friendly name from senderId (e.g., "tuanbm@htth.vn" -> "tuanbm")
            const friendlyName = senderId ? senderId.split('@')[0] : 'Support';

            client.send(JSON.stringify({
                type: 'agent',
                text: textMessage,
                sender: friendlyName
            }));
        } else {
            log('warn', `Client ${targetSocketId} connection not found for chat ${chatId}`);
            chatToSocket.delete(chatId); // Auto-cleanup if client gone
        }
    } else {
        log('debug', `Ignoring message for unmapped chat ${chatId} (likely not a web-guest chat)`);
    }
};

// Initialize TrueConf connection before starting server
async function init() {
    try {
        await trueconf.connect();
        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Widget available at http://localhost:${PORT}/widget.js`);
        });
    } catch (err) {
        console.error('Failed to initialize TrueConf API:', err);
        process.exit(1);
    }
}

init();
