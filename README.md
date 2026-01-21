# 🏓 Tischtennis 3D - PvP Edition

Ein beeindruckendes 3D-Tischtennis-Spiel mit **Echtzeit-Multiplayer** über WebSocket!

## ✨ Features

- 🎮 **Einzelspieler-Modus**: Spiele gegen die KI oder übernimm selbst die Kontrolle
- ⚔️ **PvP-Modus**: Fordere echte Gegner in Echtzeit heraus
- 🌐 **WebSocket-Technologie**: Nahtlose Echtzeit-Synchronisation
- 🎨 **Neon-Aesthetik**: Atemberaubende 3D-Grafiken mit Three.js
- ⚡ **Geschwindigkeitssteuerung**: Passe das Spieltempo an (x1 bis x5)
- 🏆 **Punktesystem**: Spiele bis 10 Punkte

## 🚀 Installation & Start

### Voraussetzungen

- [Node.js](https://nodejs.org/) (Version 14 oder höher)
- Ein moderner Webbrowser (Chrome, Firefox, Edge, Safari)

### Schritt 1: Abhängigkeiten installieren

```bash
npm install
```

### Schritt 2: WebSocket-Server starten

```bash
npm start
```

Der Server läuft nun auf `ws://localhost:8080`

### Schritt 3: Spiel öffnen

Öffne `index.html` in deinem Browser:

- **Variante A**: Doppelklick auf `index.html`
- **Variante B**: Mit lokalem Server (empfohlen):

  ```bash
  # Mit Python 3
  python3 -m http.server 3000

  # Mit Node.js (npx)
  npx serve .
  ```

  Dann öffne: `http://localhost:3000`

## 🎮 Spielanleitung

### Steuerung

- **Maus bewegen**: Steuere deinen Schläger (in "Selbst spielen" oder PvP-Modus)

### Modi

1. **CPU vs CPU**: Zwei KIs spielen gegeneinander (Standard)
2. **Selbst spielen**: Du gegen die KI
3. **PvP Spielen**: Online gegen echte Gegner

### PvP-Modus starten

1. Klicke auf den Button **"PvP Spielen"** ⚔️
2. Das Matchmaking-Overlay erscheint
3. Warte, bis ein anderer Spieler beitritt
4. Das Spiel startet automatisch, wenn ein Match gefunden wurde!

### Spielablauf im PvP

- **Spieler 1** (vorderer Schläger): Kontrolliert die Ball-Physik
- **Spieler 2** (hinterer Schläger): Erhält Ball-Updates in Echtzeit
- Beide Spieler steuern ihre Schläger mit der Maus
- Punkte werden automatisch synchronisiert

## 📁 Projektstruktur

```
mm/
├── index.html          # Haupt-HTML-Datei
├── style.css           # Styling & Animationen
├── script.js           # Spiel-Logik & WebSocket-Client
├── server.js           # WebSocket-Server für PvP
├── package.json        # Node.js-Abhängigkeiten
└── README.md           # Diese Datei
```

## 🔧 Technologie-Stack

- **Frontend**:
  - Three.js (3D-Rendering)
  - Vanilla JavaScript
  - CSS3 (Glassmorphism & Animationen)

- **Backend**:
  - Node.js
  - WebSocket (`ws` library)

## 🌐 WebSocket-Events

### Client → Server

- `find_match`: Suche nach einem Match
- `paddle_update`: Schläger-Position senden
- `ball_update`: Ball-Position synchronisieren (nur Spieler 1)
- `score_update`: Punktestand aktualisieren (nur Spieler 1)
- `leave_game`: Spiel verlassen

### Server → Client

- `waiting`: Warte auf Gegner
- `match_found`: Match gefunden, enthält Spielernummer
- `opponent_paddle`: Gegner-Schläger-Position
- `ball_sync`: Ball-Synchronisation
- `score_sync`: Punktestand-Update
- `opponent_left`: Gegner hat das Spiel verlassen

## 🐛 Troubleshooting

### "Fehler bei der Verbindung zum Server"

- Stelle sicher, dass der WebSocket-Server läuft (`npm start`)
- Überprüfe, ob Port 8080 verfügbar ist
- Firewall-Einstellungen prüfen

### Ball läuft nicht synchron im PvP

- Der Ball wird von Spieler 1 berechnet und an Spieler 2 gesendet
- Netzwerk-Latenz kann minimale Verzögerungen verursachen

### Spieler können sich nicht verbinden

- Beide Spieler müssen mit demselben WebSocket-Server verbunden sein
- Bei Remote-Spielen: Ersetze `localhost` mit der Server-IP

## 🎯 Nächste Schritte / Erweiterungen

- 🏆 Rangliste & Spielerstatistiken
- 💬 Chat-Funktion
- 🎨 Anpassbare Schläger & Tische
- 🔊 Sound-Effekte
- 📱 Mobile-Touch-Steuerung
- 🌍 Cloud-Deployment (Heroku, AWS, etc.)

## 📝 Lizenz

MIT License - Frei zur Verwendung und Modifikation

---

**Viel Spaß beim Spielen! 🏓**
