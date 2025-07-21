# Backgammon Mobile Server

A Node.js server to host your Backgammon mobile game on your local network.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Development Mode (with auto-restart)
```bash
npm run dev
```

## 🌐 Access the Game

After starting the server, you'll see output like:
```
🎮 Backgammon Mobile Server is running!
════════════════════════════════════════
📱 Local access: http://localhost:3000
🌐 Network access: http://192.168.1.100:3000
════════════════════════════════════════
```

- **Local access**: Use this URL on the same computer
- **Network access**: Share this URL with other devices on the same WiFi network

## 📱 Mobile Access

1. Make sure your mobile device is connected to the same WiFi network
2. Open the network URL (e.g., `http://192.168.1.100:3000`) in your mobile browser
3. Add to home screen for a native app experience

## 🎮 Game Features

- Mobile-optimized Backgammon game
- Touch controls for smartphones and tablets
- German language interface
- Responsive design that works on all screen sizes

## 🛠️ Troubleshooting

### Can't access from other devices?
- Ensure all devices are on the same WiFi network
- Check if your firewall is blocking port 3000
- On macOS/Linux, you might need to allow connections through the firewall

### Change the port?
Set the PORT environment variable:
```bash
PORT=8080 npm start
```

## 📁 Project Structure

```
/
├── index.html          # Main game file
├── server.js           # Node.js Express server
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## 🔧 Server Configuration

The server:
- Serves static files from the project directory
- Enables CORS for cross-origin requests
- Listens on all network interfaces (0.0.0.0)
- Provides a health check endpoint at `/health`

## 📝 License

MIT License - Feel free to use and modify!
