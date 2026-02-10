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
<script src="https://trueconf-webchat.onrender.com/widget.js"></script>
```

### Contact Form API
Use the `POST /api/contact` endpoint for your existing forms:
```javascript
fetch('https://trueconf-webchat.onrender.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

- **CORS Enforcement**: Only permitted origins (configured via `ALLOWED_ORIGINS`) can access the API.
- **Rate Limiting**: Protected against spam with a limit of 5 requests per 15 minutes per IP.
- **Trust Proxy**: Configured for Render.com to ensure accurate rate limiting through the load balancer.

---

## 3. Deployment
Refer to [DEPLOYMENT.md](file:///Users/tuanbm/trueconf_chatbot/DEPLOYMENT.md) for the Render.com setup guide.
