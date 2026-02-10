# Deployment Guide (Render.com)

This service is optimized for deployment on Render.com, providing automatic HTTPS and managed infrastructure.

## Environment Variables
In the Render Dashboard, add the following key-value pairs in the **Environment** tab:

| Key | Description |
|---|---|
| `TRUECONF_SERVER` | Your TrueConf Server FQDN (e.g., `htth.vn`) |
| `CLIENT_ID` | OAuth2 Client ID from TrueConf API Panel |
| `CLIENT_SECRET` | OAuth2 Client Secret from TrueConf API Panel |
| `BOT_USER` | Bot account username |
| `BOT_PASS` | Bot account password |
| `STAFF_USER` | Comma-separated TrueConf IDs for support staff |
| `MAIL_HOST` | SMTP Host (e.g., `smtp.larksuite.com`) |
| `MAIL_PORT` | SMTP Port (e.g., `465` for SSL) |
| `MAIL_USER` | SMTP Username (`trueconf@haproinfo.vn`) |
| `MAIL_PASS` | SMTP Password |
| `MAIL_FROM` | From address header |
| `MAIL_TO` | Recipient address for form submissions |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins (e.g., `https://truecon.vn`) |
| `API_KEY` | (Optional) Secret key for backend testing. **Set only in Render Env, never in code.** |

## Deployment Steps
1. Push your code to a GitHub repository.
2. In [Render](https://render.com/), create a "New Web Service" from your repo.
3. Select **Node** as the Runtime.
4. Render will automatically detect `package.json`, install dependencies, and start the server using `npm start`.

---
Refer to [README.md](file:///Users/tuanbm/trueconf_chatbot/README.md) for integration and security details.
