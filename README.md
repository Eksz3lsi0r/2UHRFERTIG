# Backgammon Online Multiplayer

Ein Node.js WebSocket-basierter Backgammon-Server für Echtzeit-Multiplayer-Spiele im Browser.

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
🎮 Backgammon Multiplayer Server is running!
════════════════════════════════════════
📱 Local access: http://localhost:3001
🌐 Network access: http://192.168.1.100:3001
════════════════════════════════════════
```

- **Multiplayer Game**: http://localhost:3001 (Standard)
- **Single Player**: http://localhost:3001/single (Original Version)
- **Local access**: Use this URL on the same computer
- **Network access**: Share this URL with other devices on the same WiFi network

## 🎮 Multiplayer Features

### Matchmaking System
- Automatisches Matchmaking für 2 Spieler
- Warteschlange mit Positionsanzeige
- Sofortiger Spielstart wenn 2 Spieler bereit sind

### Real-time Gameplay  
- WebSocket-basierte Echtzeitkommunikation
- Synchronisierte Spielzustände zwischen beiden Spielern
- Live-Updates für alle Spielaktionen (Würfeln, Züge, etc.)

### Game Features
- Vollständige Backgammon-Regeln implementiert
- Spieler-spezifische Aktionen (nur der aktuelle Spieler kann agieren)
- Automatische Zugerkennung und Validierung
- Spiel-Ende-Erkennung mit Gewinner-Anzeige

### Mobile Optimiert
- Touch-Controls für Smartphones und Tablets  
- Deutsche Benutzeroberfläche
- Responsive Design für alle Bildschirmgrößen
- Verbindungsstatus-Anzeige

## 📱 Mobile Access

1. Stelle sicher, dass dein mobiles Gerät mit demselben WiFi-Netzwerk verbunden ist
2. Öffne die Netzwerk-URL (z.B. `http://192.168.1.100:3001`) in deinem Browser
3. Gib deinen Namen ein und trete der Warteschlange bei
4. Warte auf einen zweiten Spieler oder bitte einen Freund, ebenfalls beizutreten

## � How to Play Multiplayer

1. **Namen eingeben**: Gib deinen Spielernamen ein
2. **Warteschlange beitreten**: Klicke auf "Spiel beitreten"  
3. **Auf Gegner warten**: Das System sucht automatisch nach einem zweiten Spieler
4. **Spielen**: Sobald zwei Spieler gefunden sind, startet das Spiel automatisch
5. **Abwechselnd spielen**: Weiß beginnt, dann abwechselnd zwischen den Spielern

## 🛠️ Troubleshooting

### Can't access from other devices?
- Ensure all devices are on the same WiFi network
- Check if your firewall is blocking the port
- On macOS/Linux, you might need to allow connections through the firewall

### Change the port?
Set the PORT environment variable:
```bash
PORT=8080 npm start
```

### Server already running error?
If port 3000 is busy, the server automatically tries 3001. You can also specify a custom port:
```bash
PORT=3002 npm start
```

## 📁 Project Structure

```
/
├── multiplayer.html    # Main multiplayer game file (WebSocket-based)
├── index.html         # Single player version  
├── server.js          # Node.js Express + Socket.io server
├── package.json       # Node.js dependencies
└── README.md          # This file
```

## 🔧 Server Configuration

The server:
- **Express.js**: Serves static files and handles HTTP requests
- **Socket.io**: Manages real-time WebSocket connections
- **Matchmaking**: Automatic player pairing system  
- **Game Management**: Tracks active games and player states
- **CORS enabled**: Allows cross-origin requests
- **Health check**: Available at `/health` with game statistics

## 🎲 Technical Implementation

### Backend (Node.js + Socket.io)
- Real-time WebSocket communication
- Matchmaking queue system
- Game state management
- Move validation and synchronization
- Automatic player pairing

### Frontend (JavaScript + WebSocket)
- Socket.io client for real-time communication  
- Lobby system with waiting queue
- Real-time game state updates
- Touch-optimized mobile interface
- Connection status monitoring

## 📝 License

MIT License - Feel free to use and modify!
