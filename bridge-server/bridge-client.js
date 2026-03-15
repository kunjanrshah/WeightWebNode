const net = require('net');
const { Server } = require('socket.io');
const http = require('http');

const SCALE_IP = '127.0.0.1'; // IP of the Scale
const TCP_PORT = 8000;         // Port the Scale is listening on
const WS_PORT = 3500;

const httpServer = http.createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

let scaleSocket = null;

// 1. WebSocket logic
io.on('connection', (webSocket) => {
    console.log('✅ UI connected');
    webSocket.on('weight-reset', () => {
        if (scaleSocket) {
            console.log('🔄 Sending reset command (~) to Scale...');
            scaleSocket.write('~'); 
        } else {
            console.log('⚠️ Reset failed: Scale not connected');
        }
    });
});

// 2. TCP Client Logic
function connectToScale() {
    console.log('🔄 Attempting to connect to Scale...');
    
    // Create connection instead of server
    const client = net.createConnection({ host: SCALE_IP, port: TCP_PORT }, () => {
        console.log('🔗 Connected to Scale successfully');
        scaleSocket = client;
    });

    client.on('data', (data) => {
        const weight = data.toString().trim();
        console.log("weight-update receives",weight);
        io.emit('weight-update', weight);
    });

    client.on('error', (err) => {
        console.error('❌ Connection Error:', err.message);
    });

    client.on('close', () => {
        console.log('🔌 Scale connection closed. Retrying in 5s...');
        scaleSocket = null;
        setTimeout(connectToScale, 5000); // Reconnect loop
    });
}

httpServer.listen(WS_PORT, () => {
    console.log(`🚀 Bridge running. WS: ${WS_PORT} | Connecting to TCP: ${TCP_PORT}`);
    connectToScale();
});