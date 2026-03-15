const net = require('net');
const { Server } = require('socket.io');
const http = require('http');

// --- CONFIGURATION ---
const SCALES = [
    { id: 'scale_1', host: '127.0.0.1', port: 8000 },
    { id: 'scale_2', host: '127.0.0.1', port: 8001 } // Change to your second IP/Port
];
const WS_PORT = 3500;

const httpServer = http.createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

// Store active connections in an object: { scale_1: socket, scale_2: socket }
const activeScales = {};

// 1. WebSocket logic
io.on('connection', (webSocket) => {
    console.log('✅ UI connected');

    // Triggered by socket.emit('weight-reset') from React
    webSocket.on('weight-reset', () => {
        console.log('🔄 Global Reset triggered. Sending (~) to all connected scales...');
        
        // Loop through all currently connected scales and send the '~'
        Object.keys(activeScales).forEach(scaleId => {
            const targetSocket = activeScales[scaleId];
            if (targetSocket) {
                console.log(`   -> Resetting ${scaleId}`);
                targetSocket.write('~');
            }
        });
    });
});

// 2. TCP Client Logic (Virtualized for multiple instances)
function connectToScale(config) {
    console.log(`🔄 Attempting to connect to ${config.id} at ${config.host}:${config.port}...`);
    
    const client = net.createConnection({ host: config.host, port: config.port }, () => {
        console.log(`🔗 Connected to ${config.id} successfully`);
        activeScales[config.id] = client;
    });

    client.on('data', (data) => {
        const weight = data.toString().trim();
        // Emit with ID so React knows which scale sent the data
        io.emit('weight-update', { id: config.id, weight: weight });
    });

    client.on('error', (err) => {
        console.error(`❌ ${config.id} Connection Error:`, err.message);
    });

    client.on('close', () => {
        console.log(`🔌 ${config.id} connection closed. Retrying in 5s...`);
        delete activeScales[config.id];
        setTimeout(() => connectToScale(config), 5000);
    });
}

// Start everything
httpServer.listen(WS_PORT, () => {
    console.log(`🚀 Bridge running. WS: ${WS_PORT}`);
    // Initialize connection for every scale in the config
    SCALES.forEach(scale => connectToScale(scale));
});