const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('.'));

// Serve the main game file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backgammon server is running!' });
});

// Function to get local IP address
function getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        const networkInterface = networkInterfaces[interfaceName];

        for (const connection of networkInterface) {
            // Skip internal and non-IPv4 addresses
            if (!connection.internal && connection.family === 'IPv4') {
                return connection.address;
            }
        }
    }

    return 'localhost';
}

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();

    console.log('🎮 Backgammon Mobile Server is running!');
    console.log('════════════════════════════════════════');
    console.log(`📱 Local access: http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://${localIP}:${PORT}`);
    console.log('════════════════════════════════════════');
    console.log('💡 Share the network URL with other devices on the same network!');
    console.log('⏹️  Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Backgammon server...');
    process.exit(0);
});

module.exports = app;
