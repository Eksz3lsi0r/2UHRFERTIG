// WebSocket Connection
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.enabled = false; // Disabled by default for offline play
    }

    connect() {
        if (!this.enabled) {
            console.log('WebSocket disabled - playing offline');
            return;
        }

        try {
            this.ws = new WebSocket('ws://localhost:8080');

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus('Online');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.connected = false;
                this.updateConnectionStatus('Offline Mode');
                if (this.enabled) {
                    this.reconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.warn('WebSocket connection failed - continuing in offline mode');
                this.connected = false;
                this.enabled = false; // Disable further attempts
                this.updateConnectionStatus('Offline Mode');
            };
        } catch (error) {
            console.warn('WebSocket not available - continuing in offline mode');
            this.enabled = false;
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.enabled) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`WebSocket reconnection attempt ${this.reconnectAttempts}`);
                this.connect();
            }, 2000 * this.reconnectAttempts);
        } else {
            console.log('WebSocket reconnection attempts exhausted - continuing offline');
            this.enabled = false;
        }
    }

    send(data) {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            // Silently ignore if not connected (offline mode)
            console.log('Offline mode - data not sent to server');
        }
    }

    enable() {
        this.enabled = true;
        if (!this.connected) {
            this.connect();
        }
    }

    disable() {
        this.enabled = false;
        if (this.ws) {
            this.ws.close();
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = 'connection-status ' + (status === 'Online' ? 'online' : 'offline');
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'gameState':
                // Handle game state updates
                break;
            case 'playerUpdate':
                // Handle player updates
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
}
