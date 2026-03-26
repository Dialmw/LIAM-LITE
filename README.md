# ⚡ LIAM LITE — Mini WhatsApp Bot

> Fast. Light. 50 Commands. No bloat.

## Features
- ⚡ Ultra-fast responses
- 📦 50 essential commands
- 🔗 Max 10 sessions
- 🎨 2 menu styles: Classic & Fancy  
- 🚫 NO bot image on responses
- 🤖 AI chatbot (Pollinations)
- 📱 Termux & Panel friendly

## Quick Start

### Install
```bash
git clone <repo>
cd liam-lite
npm install
```

### Setup
Edit `settings/settings.js`:
- Set your phone number
- Paste session ID from pairing site

### Run
```bash
npm start
# or
pm2 start index.js --name LIAM-LITE
```

## Get Session ID
Visit: https://liam-scanner.onrender.com/pair

## Menu Styles
- `.classic` — Box-style headers
- `.fancy` — Modern aesthetic

## Session Setup
- **Max Sessions:** 10
- Set `SESSION_ID` env var or paste in `settings.js`

## Deploy

### Render
Set env vars: `SESSION_ID=LIAM:~...`

### Termux
```bash
pkg install nodejs ffmpeg
npm start
```

### Heroku
Set `SESSION_ID` in Config Vars.

---
*By Liam — © 2025*
