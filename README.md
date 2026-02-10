# TrueConf Web Chat & Mailer Service

A lightweight Node.js service that powers the TrueConf web chat widget and provides a secure contact form mail sender.

## Features
- **Real-time Chat**: Connects web guests to support staff via TrueConf group chats.
- **Mail Sender**: Secure API for sending contact form submissions via SMTP.
- **Production Ready**: Optimized for Render.com with built-in security.

---

## 1. Landing Page Integration (`truecon.vn`)

### Chat Widget
Add the following to your HTML before `</body>`:
```html
<script src="https://your-service.onrender.com/widget.js"></script>
```

### Contact Form API
Use the `POST /api/contact` endpoint for your existing forms:
```javascript
fetch('https://your-service.onrender.com/api/contact', {
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

- **CORS Whitelist**: Access is restricted to trusted origins (configured via `ALLOWED_ORIGINS`).
- **Rate Limiting**: Mail sender is limited to 5 requests per 15 minutes per IP to prevent spam.
- **Environment Isolation**: No secrets are stored in the codebase; all configuration is environment-driven.

---

## 3. Deployment
Refer to [DEPLOYMENT.md](file:///Users/tuanbm/trueconf_chatbot/DEPLOYMENT.md) for the exclusive Render.com setup guide.
