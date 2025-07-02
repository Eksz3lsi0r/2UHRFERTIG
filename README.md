# 🎲 Backgammon Online

Ein vollständiges, responsives Backgammon-Spiel für den Browser mit Echtzeit-Multiplayer-Funktionalität.

## Features

- **🌐 Online Multiplayer**: Spiele gegen echte Gegner in Echtzeit
- **🔍 Automatisches Matchmaking**: Einfach "Spiel starten" klicken und automatisch einen Gegner finden
- **📱 Responsive Design**: Funktioniert perfekt auf Handys, Tablets und Desktop-Computern
- **⚡ Echtzeit-Kommunikation**: Sofortige Spielzüge dank WebSocket-Technologie
- **🎯 Vollständige Spielregeln**: Implementiert die klassischen Backgammon-Regeln

## Technologie-Stack

- **Backend**: Node.js mit Express und Socket.io
- **Frontend**: HTML5, CSS3, vanilla JavaScript
- **Kommunikation**: WebSocket für Echtzeit-Gameplay
- **Styling**: Responsive CSS mit modernem Design

## Installation und Start

1. **Abhängigkeiten installieren:**

   ```bash
   npm install
   ```

2. **Server starten:**

   ```bash
   npm start
   ```

3. **Spiel öffnen:**
   Öffne deinen Browser und gehe zu `http://localhost:3000`

## Wie man spielt

1. **Namen eingeben**: Gib deinen Spielernamen ein (optional)
2. **Spiel starten**: Klicke auf "Spiel starten"
3. **Auf Gegner warten**: Das System sucht automatisch einen verfügbaren Gegner
4. **Spielen**: Würfle und bewege deine Steine nach den klassischen Backgammon-Regeln

## Spielregeln

- Jeder Spieler startet mit 15 Steinen
- Würfle und bewege deine Steine entsprechend der Augenzahl
- Ziel: Bringe alle deine Steine ins Heimfeld und dann vom Brett
- Klassische Backgammon-Regeln werden befolgt

## Projektstruktur

```
BackGammon/
├── server.js              # Hauptserver-Datei
├── game/
│   └── BackgammonGame.js  # Spiellogik
├── public/
│   ├── index.html         # Haupt-HTML-Datei
│   ├── styles.css         # Responsive CSS-Styles
│   └── game.js           # Client-seitige Spiellogik
├── package.json
└── README.md
```

## Entwicklung

Das Spiel ist modular aufgebaut:

- **Server (`server.js`)**: Verwaltet WebSocket-Verbindungen und Matchmaking
- **Spiellogik (`game/BackgammonGame.js`)**: Implementiert Backgammon-Regeln
- **Frontend (`public/`)**: Responsive Benutzeroberfläche mit Echtzeit-Updates

## Mobile Unterstützung

Das Spiel ist vollständig responsive und funktioniert auf:

- ✅ Smartphones (iOS/Android)
- ✅ Tablets
- ✅ Desktop-Computer
- ✅ Verschiedene Bildschirmgrößen und Orientierungen

## Lizenz

MIT License
