# JavaScript Modular Architecture Documentation

## Übersicht
Die JavaScript-Dateien wurden von 2 großen Dateien (722 + 453 Zeilen) in 12 kleinere, fokussierte Module aufgeteilt.

## Neue Verzeichnisstruktur

```
js/
├── config.js                    # Spielkonfiguration (unverändert)
├── websocket.js                 # WebSocket-Client (unverändert)
├── renderer.js                  # 3D-Renderer (unverändert)
├── inputHandler.js              # Input-Handling (unverändert)
├── main.js                      # Hauptinitialisierung (unverändert)
├── entities/
│   ├── base-sprite.js           # Basis GameSprite-Klasse
│   ├── player.js                # Player-Entität
│   ├── projectile.js            # Projektil-Entität
│   ├── enemy.js                 # Feind-Entität
│   ├── gate.js                  # Tor-Entität
│   └── boss.js                  # Boss-Entität
├── effects/
│   └── particles.js             # Partikel- und FloatingText-Effekte
├── systems/
│   ├── collision.js             # Kollisionserkennung
│   ├── spawning.js              # Entitäten-Spawning
│   ├── data-manager.js          # Speichern/Laden von Spieldaten
│   └── ui-manager.js            # UI-Updates
├── core/
│   └── game-loop.js             # Haupt-Spielschleife
├── game-objects.js              # Master-Import (deprecated original)
└── game-systems.js              # Master-Import (deprecated original)
```

## Lade-Reihenfolge

Die HTML-Datei lädt die Skripte in der richtigen Reihenfolge:

1. **Konfiguration**: `config.js`, `websocket.js`
2. **Basis-Klassen**: `entities/base-sprite.js`
3. **Entitäten**: `player.js`, `projectile.js`, `enemy.js`, `gate.js`, `boss.js`
4. **Effekte**: `effects/particles.js`
5. **Systeme**: `collision.js`, `spawning.js`, `data-manager.js`, `ui-manager.js`
6. **Kern**: `core/game-loop.js`
7. **Renderer & Input**: `renderer.js`, `inputHandler.js`
8. **Initialisierung**: `main.js`

## Vorteile der neuen Architektur

### 🎯 **Modularität**
- Jede Datei hat eine klare, spezifische Verantwortung
- Einfacher zu verstehen und zu warten

### 📦 **Wiederverwendbarkeit**
- Entitäten können einzeln wiederverwendet werden
- Systeme können in anderen Projekten genutzt werden

### 🔧 **Wartbarkeit**
- Änderungen an einer Entität betreffen nur eine Datei
- Bugs können schneller lokalisiert werden

### 📈 **Skalierbarkeit**
- Neue Entitäten können einfach hinzugefügt werden
- Systeme können unabhängig erweitert werden

### 🧪 **Testbarkeit**
- Einzelne Module können isoliert getestet werden
- Weniger Seiteneffekte zwischen Komponenten

## Dateigrößen im Vergleich

**Vorher:**
- `gameObjects.js`: 723 Zeilen
- `gameLogic.js`: 453 Zeilen
- **Total**: 1176 Zeilen

**Nachher (größte Dateien):**
- `entities/player.js`: ~120 Zeilen
- `entities/gate.js`: ~110 Zeilen
- `systems/collision.js`: ~180 Zeilen
- `core/game-loop.js`: ~140 Zeilen

## Hinzufügen neuer Features

### Neue Entität hinzufügen:
1. Erstelle neue Datei in `entities/`
2. Erweitere `GameSprite` Basis-Klasse
3. Füge zur HTML-Lade-Reihenfolge hinzu

### Neues System hinzufügen:
1. Erstelle neue Datei in `systems/`
2. Implementiere spezifische Funktionalität
3. Integriere in `core/game-loop.js`

### Neue Effekte hinzufügen:
1. Erweitere `effects/particles.js`
2. Oder erstelle neue Datei in `effects/`

## Backward Compatibility

Die ursprünglichen Dateien (`gameObjects.js`, `gameLogic.js`) bleiben mit Deprecation-Warnings erhalten, um Kompatibilität zu gewährleisten.
