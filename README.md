# TrueConf Web Chat & Mailer Service

A lightweight Node.js service that powers the TrueConf web chat widget and provide a secure contact form mail sender.

## Features
- **Real-time Chat**: Connects web guests to support staff via TrueConf group chats.
- **Mail Sender**: Secure API for sending contact form submissions via SMTP.
- **Production Ready**: Optimized for Render.com with built-in security.

---

## 1. Landing Page Integration (`truecon.vn`)

### Chat Widget
Add the following to your HTML before `</body>`:
```html
<link rel="stylesheet" href="http://103.232.121.14:3000/widget.css">
<script src="http://103.232.121.14:3000/widget.js"></script>
```

### Contact Form API
Use the `POST /api/contact` endpoint. 

#### Option A: Frontend Integration
If calling from a browser, ensure your domain is in `ALLOWED_ORIGINS`. No API Key is needed in the JS code.

#### Option B: Backend Integration (Secure)
If calling from another server (or testing via `curl`), include the `X-API-Key` header:
```javascript
// Secure backend-to-backend call
fetch('http://103.232.121.14:3000/api/contact', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CHAT_API_KEY // Stored securely on your server
    },
    body: JSON.stringify({
        name: "User Name",
        email: "user@example.com",
        subject: "Inquiry",
        message: "Hello world"
    })
});
```

---

## 2. Security Measures

- **Frontend Security (CORS)**: Access is restricted to domains in `ALLOWED_ORIGINS`. Use this for browser-based integration.
- **Backend Security (API Key)**: Configure `API_KEY` in Render.com environment variables. Use this for server-side calls or cross-origin testing. **Never expose this key in public JavaScript files.**
- **Rate Limiting**: Protected against spam with a limit of 5 requests per 15 minutes per IP.
- **Trust Proxy**: Configured for Render.com to ensure accurate rate limiting through the load balancer.

---

## 3. Deployment
Refer to [DEPLOYMENT.md](file:///Users/tuanbm/trueconf_chatbot/DEPLOYMENT.md) for the Render.com setup guide.
