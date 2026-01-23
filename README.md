# 🏓 Tischtennis 3D - Multiplayer Edition

Ein beeindruckendes **3D-Tischtennis-Spiel** mit Echtzeit-Multiplayer über WebSocket, entwickelt mit **Three.js**, **React**, **Socket.io** und **TypeScript**.

![Tischtennis 3D](https://img.shields.io/badge/Game-Tischtennis%203D-ff00ff?style=for-the-badge)
![WebSocket](https://img.shields.io/badge/WebSocket-Socket.io-00ffff?style=for-the-badge)
![Three.js](https://img.shields.io/badge/3D-Three.js-000000?style=for-the-badge)

---

## ✨ Features

### 🎮 Spielmodi
- **CPU vs CPU**: Zwei KI-Spieler spielen gegeneinander (perfekt zum Zuschauen)
- **Selbst spielen**: Spiele gegen eine intelligente KI
- **PvP-Modus**: Fordere echte Gegner in Echtzeit heraus

### 🌐 Echtzeit-Multiplayer
- **Automatisches Matchmaking**: Spieler werden automatisch in einer Warteschlange gepaart
- **WebSocket-Synchronisation**: Nahtlose Echtzeit-Kommunikation zwischen Spielern
- **Latenz-Kompensation**: Ball-Update-Throttling für flüssiges Gameplay
- **Reconnect-Handling**: Robuste Verbindungsverwaltung

### 🎨 Neon-Cyberpunk-Ästhetik
- **Animierter Hintergrund**: Schwebende Gradient-Orbs und Partikel
- **Glassmorphism-Effekte**: Moderne UI-Panels mit Blur-Effekten
- **Neon-Beleuchtung**: Magenta, Cyan und Gelb-Akzente
- **3D-Grafik**: Realistische Schatten und Beleuchtung mit Three.js

### ⚡ Gameplay
- **Tastatursteuerung**: 
  - Spieler 1: **A** / **D** (Links/Rechts)
  - Spieler 2: **←** / **→** (Links/Rechts)
- **Geschwindigkeitssteuerung**: Passe das Spieltempo an (x1 bis x5)
- **Realistische Physik**: Ball-Bounce, Spin und Kollisionserkennung
- **Live-Scoreboard**: Echtzeit-Punktestand-Synchronisation

### 📊 Statistiken & Historie
- **Spielerstatistiken**: Tracking von Spielen, Siegen, Niederlagen
- **Match-Historie**: Vollständige Aufzeichnung aller gespielten Matches
- **Datenbank-Integration**: MySQL/TiDB für persistente Datenspeicherung

---

## 🚀 Technologie-Stack

### Frontend
- **React 19** mit TypeScript
- **Three.js** für 3D-Rendering
- **Socket.io-client** für WebSocket-Kommunikation
- **Tailwind CSS 4** mit Neon-Cyberpunk-Theme
- **shadcn/ui** für UI-Komponenten
- **Vite** als Build-Tool

### Backend
- **Node.js** mit Express 4
- **Socket.io** für Echtzeit-WebSocket-Server
- **tRPC 11** für type-safe API
- **Drizzle ORM** für Datenbankzugriff
- **MySQL/TiDB** als Datenbank

### DevOps
- **Vitest** für Unit-Tests
- **TypeScript** für Type-Safety
- **ESLint** & **Prettier** für Code-Qualität

---

## 📁 Projektstruktur

```
tischtennis-multiplayer/
├── client/
│   ├── src/
│   │   ├── game/
│   │   │   └── GameEngine.ts       # Three.js 3D-Engine
│   │   ├── pages/
│   │   │   ├── Game.tsx            # Haupt-Spielkomponente
│   │   │   └── NotFound.tsx
│   │   ├── components/             # UI-Komponenten
│   │   ├── App.tsx                 # Routing
│   │   └── index.css               # Neon-Cyberpunk-Styling
│   └── index.html
├── server/
│   ├── gameServer.ts               # WebSocket-Server & Matchmaking
│   ├── db.ts                       # Datenbank-Queries
│   ├── routers.ts                  # tRPC-Router
│   └── _core/                      # Framework-Plumbing
├── drizzle/
│   └── schema.ts                   # Datenbank-Schema
├── shared/
│   └── gameTypes.ts                # Gemeinsame TypeScript-Typen
└── todo.md                         # Feature-Tracking
```

---

## 🎮 Spielanleitung

### Steuerung

#### CPU vs CPU Modus
- Keine Steuerung erforderlich
- Beobachte, wie zwei KIs gegeneinander spielen

#### Selbst spielen Modus
- **A**: Schläger nach links bewegen
- **D**: Schläger nach rechts bewegen
- Spiele gegen eine intelligente KI

#### PvP-Modus
- **Spieler 1**: **A** / **D** (Links/Rechts)
- **Spieler 2**: **←** / **→** (Links/Rechts)
- Beide Spieler steuern ihre Schläger nur horizontal

### Geschwindigkeitssteuerung
- Klicke auf den **⚡ x1** Button, um die Spielgeschwindigkeit zu ändern
- Verfügbare Geschwindigkeiten: x1, x2, x3, x4, x5

### PvP-Matchmaking
1. Klicke auf **⚔️ PvP Spielen**
2. Das System sucht automatisch nach einem Gegner
3. Sobald ein Match gefunden wurde, startet das Spiel
4. Spieler 1 kontrolliert die Ball-Physik, Spieler 2 erhält Updates

---

## 🔧 Installation & Entwicklung

### Voraussetzungen
- Node.js (Version 18+)
- pnpm (empfohlen) oder npm
- MySQL/TiDB-Datenbank

### Setup

1. **Repository klonen**
```bash
git clone https://github.com/Eksz3lsi0r/2UHRFERTIG.git
cd tischtennis-multiplayer
```

2. **Dependencies installieren**
```bash
pnpm install
```

3. **Datenbank-Migration**
```bash
pnpm db:push
```

4. **Development-Server starten**
```bash
pnpm dev
```

Der Server läuft nun auf `http://localhost:3000`

### Tests ausführen
```bash
pnpm test
```

---

## 🌐 WebSocket-Events

### Client → Server

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `find_match` | `{ userId: number \| null }` | Suche nach einem Match |
| `paddle_update` | `{ position: Vector3 }` | Schläger-Position senden |
| `ball_update` | `{ position: Vector3, velocity: Vector3 }` | Ball-Position synchronisieren (nur Spieler 1) |
| `score_update` | `{ score1: number, score2: number }` | Punktestand aktualisieren (nur Spieler 1) |
| `leave_game` | - | Spiel verlassen |

### Server → Client

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `waiting` | - | Warte auf Gegner |
| `match_found` | `{ playerNumber: 1\|2, gameId: string }` | Match gefunden |
| `opponent_paddle` | `{ position: Vector3, playerNumber: 1\|2 }` | Gegner-Schläger-Position |
| `ball_sync` | `{ position: Vector3, velocity: Vector3 }` | Ball-Synchronisation |
| `score_sync` | `{ score1: number, score2: number }` | Punktestand-Update |
| `opponent_left` | - | Gegner hat das Spiel verlassen |

---

## 📊 Datenbank-Schema

### `users`
Benutzer-Authentifizierung und Profile

### `player_stats`
Spielerstatistiken (Spiele, Siege, Niederlagen, Punkte)

### `match_history`
Vollständige Match-Historie mit Spielergebnissen

---

## 🎨 Design-Philosophie

Das Spiel folgt einer **Neon-Cyberpunk-Ästhetik** mit:
- **Dunklem Hintergrund**: Tiefes Blau-Schwarz (oklch(0.15 0.02 280))
- **Neon-Akzente**: Magenta, Cyan und Gelb
- **Glassmorphism**: Transparente UI-Panels mit Blur-Effekten
- **Animationen**: Schwebende Orbs, Partikel und Glow-Effekte
- **Typografie**: Orbitron (Überschriften) und Rajdhani (Text)

---

## 🐛 Troubleshooting

### WebSocket-Verbindungsprobleme
- Stelle sicher, dass der Server läuft
- Überprüfe die Browser-Konsole auf Fehler
- Firewall-Einstellungen prüfen

### Ball läuft nicht synchron im PvP
- Der Ball wird von Spieler 1 berechnet und an Spieler 2 gesendet
- Netzwerk-Latenz kann minimale Verzögerungen verursachen
- Ball-Updates werden auf 50ms gedrosselt (Throttling)

### 3D-Rendering-Probleme
- Stelle sicher, dass WebGL im Browser aktiviert ist
- Aktualisiere Grafiktreiber
- Verwende einen modernen Browser (Chrome, Firefox, Edge)

---

## 🚧 Zukünftige Erweiterungen

- [ ] 🏆 Globale Rangliste
- [ ] 💬 In-Game-Chat
- [ ] 🎨 Anpassbare Schläger und Tische
- [ ] 🔊 Sound-Effekte und Musik
- [ ] 📱 Mobile Touch-Steuerung
- [ ] 🎥 Replay-System
- [ ] 🏅 Achievements und Badges
- [ ] 👥 Freundesliste und Challenges

---

## 📝 Lizenz

MIT License - Frei zur Verwendung und Modifikation

---

## 🙏 Credits

Entwickelt mit ❤️ unter Verwendung von:
- [Three.js](https://threejs.org/) - 3D-Grafik
- [Socket.io](https://socket.io/) - WebSocket-Kommunikation
- [React](https://react.dev/) - UI-Framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [tRPC](https://trpc.io/) - Type-safe API

---

**Viel Spaß beim Spielen! 🏓✨**
