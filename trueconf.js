const axios = require('axios');
const WebSocket = require('ws');
require('dotenv').config();

class TrueConfAPI {
    constructor() {
        this.server = process.env.TRUECONF_SERVER;
        this.clientId = process.env.CLIENT_ID;
        this.clientSecret = process.env.CLIENT_SECRET;
        this.botUser = process.env.BOT_USER;
        this.botPass = process.env.BOT_PASS;

        // For 5.5.2+, the path is usually /websocket/chat_bot/ with a trailing slash
        // We use port 443/wss if available, otherwise 4309/ws
        this.bridgeUrl = `wss://${this.server}/websocket/chat_bot/`;
        this.tokenUrl = `https://${this.server}/bridge/api/client/v1/oauth/token`;

        this.ws = null;
        this.accessToken = null;
        this.requestId = 1;
        this.callbacks = new Map();
        this.onMessageReceived = null;
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000;
        this.isAuthorizing = false;
    }

    log(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [TRUECONF_${level.toUpperCase()}] ${message}`, Object.keys(metadata).length ? metadata : '');
    }

    async getAccessToken() {
        try {
            this.log('info', 'Requesting new access token (Bridge JWT)...');
            const response = await axios.post(this.tokenUrl, {
                client_id: 'chat_bot',
                grant_type: 'password',
                username: this.botUser,
                password: this.botPass
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            this.accessToken = response.data.access_token;
            this.log('info', 'TrueConf Access Token obtained successfully.');
            return this.accessToken;
        } catch (error) {
            this.log('error', 'Error obtaining TrueConf access token', { error: error.response ? error.response.data : error.message });
            throw error;
        }
    }

    async login() {
        this.log('info', 'Sending login request...');
        return this.sendRequest('login', {
            login: this.botUser,
            password: this.botPass
        });
    }

    async connect() {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        return new Promise((resolve, reject) => {
            this.log('info', `Connecting to WebSocket: ${this.bridgeUrl}`);
            // Use 'json.v1' subprotocol as required by TrueConf 5.5
            this.ws = new WebSocket(this.bridgeUrl, 'json.v1', {
                rejectUnauthorized: false
            });

            this.ws.on('open', async () => {
                this.log('info', 'Connected to TrueConf Chat WebSocket.');
                this.reconnectAttempts = 0; // Reset reconnection backoff
                try {
                    await this.authorize();
                    resolve();
                } catch (err) {
                    this.log('error', 'Authentication failed during connect', { error: err.message });
                    reject(err);
                }
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleIncomingMessage(message);
                } catch (err) {
                    this.log('error', 'Error parsing incoming message', { error: err.message, data: data.toString() });
                }
            });

            this.ws.on('error', (error) => {
                this.log('error', 'WebSocket Error', { error: error.message || error });
                reject(error);
            });

            this.ws.on('close', (code, reason) => {
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
                this.log('warn', `TrueConf connection closed (Code: ${code}, Reason: ${reason}). Reconnecting in ${delay / 1000}s...`);
                this.reconnectAttempts++;
                setTimeout(() => this.connect().catch(err => this.log('error', 'Scheduled reconnection failed', { error: err.message })), delay);
            });
        });
    }

    async authorize() {
        this.log('info', 'Sending authorization request...');
        return this.sendRequest('auth', {
            token: this.accessToken,
            tokenType: "JWT",
            receiveUnread: true
        });
    }

    sendRequest(method, payload = {}) {
        return new Promise((resolve, reject) => {
            const id = this.requestId++;
            const message = {
                type: 1, // REQUEST
                id: id,
                method: method,
                payload: payload
            };

            this.callbacks.set(id, { resolve, reject });
            this.log('debug', 'Sending message', { message });
            this.ws.send(JSON.stringify(message));

            // Timeout if no response
            setTimeout(() => {
                if (this.callbacks.has(id)) {
                    this.callbacks.get(id).reject(new Error(`Request ${method} timed out after 30s`));
                    this.callbacks.delete(id);
                }
            }, 30000);
        });
    }

    handleIncomingMessage(message) {
        this.log('debug', 'Received message', { message });
        if (message.type === 2) { // RESPONSE
            const callback = this.callbacks.get(message.id);
            if (callback) {
                const payload = message.payload || {};
                if (payload.error || (payload.errorCode !== undefined && payload.errorCode !== 0)) {
                    const errorMsg = payload.error || `Error code: ${payload.errorCode}`;
                    this.log('error', `Response error for ID ${message.id}`, { error: errorMsg });
                    callback.reject(new Error(errorMsg));
                } else {
                    this.log('info', `Resolved response for ID ${message.id}`);
                    callback.resolve(payload);
                }
                this.callbacks.delete(message.id);
            }
        } else if (message.type === 1) { // SERVER REQUEST (NOTIFICATION)
            // Always acknowledge server notifications to keep connection alive
            this.log('debug', `Acknowledging server notification ID ${message.id} (${message.method})`);
            this.ws.send(JSON.stringify({
                type: 2,
                id: message.id
            }));

            if (message.method === 'sendMessage') {
                this.log('info', 'New chat message received');
                if (this.onChatMessage) {
                    this.onChatMessage(message.payload);
                }
            } else {
                this.log('debug', `Other server notification: ${message.method}`, { message });
            }
        }
    }

    async createGroupChat(name) {
        return this.sendRequest('createGroupChat', {
            title: name,
            type: 1 // GROUP_CHAT
        });
    }

    async addChatParticipant(chatId, userId) {
        return this.sendRequest('addChatParticipant', {
            chatId: chatId,
            userId: userId
        });
    }

    async sendMessage(chatId, text) {
        return this.sendRequest('sendMessage', {
            chatId: chatId,
            content: {
                text: text
            }
        });
    }

    async getChats() {
        return this.sendRequest('getChats', {
            count: 50,
            page: 1
        });
    }
}

module.exports = new TrueConfAPI();
