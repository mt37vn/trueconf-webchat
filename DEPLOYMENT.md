# TrueConf Web Chat MVP - Deployment & Integration

## 1. Render.com Deployment (Recommended for Cloud/HTTPS)
Render provides managed infrastructure and automatic SSL (HTTPS).

1. **GitHub**: Push your code to a GitHub repository.
2. **New Service**: In [Render](https://render.com/), create a "New Web Service" from your GitHub repo.
3. **Environment**: Select **Node** as the Runtime.
4. **Variables**: Add your `.env` variables in the **Environment** tab.
5. **Networking**: Render will automatically expose the app and provide an HTTPS domain (`*.onrender.com`).

---

## 2. Windows Server Deployment (Local)

### Prerequisites
- Node.js 20 LTS installed.
- Firewall: Open port 3000 (Node server) and ensure port 4309 is reachable.

### Steps
1. **Copy Files**: Copy the `trueconf_chatbot` folder to `C:\trueconf-webchat`.
2. **Install Dependencies**:
   ```cmd
   npm install
   ```
3. **Configure Environment**:
   - Copy `.env.example` to `.env`.
   - Edit the newly created `.env` file with your actual TrueConf server details.
   - Set `TRUECONF_SERVER` to your server's FQDN (e.g., `trueconf.company.com`).
4. **Run Server**:
   ```cmd
   npm start
   ```
   *Recommendation: Use `pm2` or Windows Task Scheduler to run this as a service.*

---

## 2. WordPress Integration

### Method A: Using a Plugin (Insert Headers and Footers)
1. Install the "WPCode – Insert Headers and Footers" plugin.
2. Go to **Code Snippets -> Header & Footer**.
3. In the **Footer** section, add the following:
   ```html
   <link rel="stylesheet" href="https://your-windows-server:3000/widget.css">
   <script src="https://your-windows-server:3000/widget.js" async></script>
   ```

### Method B: Via `functions.php`
Add this to your theme's `functions.php`:
```php
function add_trueconf_widget() {
    wp_enqueue_style('trueconf-widget-css', 'https://your-windows-server:3000/widget.css');
    wp_enqueue_script('trueconf-widget-js', 'https://your-windows-server:3000/widget.js', array(), null, true);
}
add_action('wp_enqueue_scripts', 'add_trueconf_widget');
```

---

## 4. Important Notes
- **Multi-Guest Support**: The system now automatically creates a new group chat for every visitor. There is no need to manually configure room IDs.
- **SSL/HTTPS**: If your WordPress site uses HTTPS, your Node.js server MUST also use HTTPS.
    - **Render**: Handles SSL automatically (Recommended).
    - **Cloudflare Tunnel**: Good for local servers with port conflicts (See `CLOUDFLARE_GUIDE.md`).
    - **Reverse Proxy**: Setup Caddy or Nginx manually.
- **CORS**: The current server allows all connections, but for production, you should restrict origins in the WebSocket and Express configuration.

---

## 5. Reverse Proxy Configuration

### Caddy (Recommended)
Caddy automatically handles SSL certificates. Add this to your `Caddyfile`:

```caddy
chatbot.yourdomain.com {
    reverse_proxy localhost:3000
    # For DNS-01 validation (if port 80/443 are blocked)
    # tls {
    #     dns <provider> <token>
    # }
}
```

### Nginx
If using Nginx, ensure you proxy WebSocket headers:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```
