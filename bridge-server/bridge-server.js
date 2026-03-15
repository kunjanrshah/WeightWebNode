const net = require('net');
const { Server } = require('socket.io');
const http = require('http');

const TCP_PORT = 8000;
const WS_PORT = 3500;

const httpServer = http.createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

let scaleSocket = null; // Store the current TCP connection

io.on('connection', (webSocket) => {
    console.log('✅ UI connected');

    // When React UI clicks "Reset"
    webSocket.on('weight-reset', () => {
        if (scaleSocket) {
            console.log('🔄 Sending reset command (~) to Scale...');
            scaleSocket.write('~'); 
        } else {
            console.log('⚠️ Reset failed: Scale not connected');
        }
    });
});

const tcpServer = net.createServer((socket) => {
    console.log('🔗 Scale hardware connected');
    scaleSocket = socket;

    socket.on('data', (data) => {
        const weight = data.toString().trim();
        io.emit('weight-update', weight);
    });

    socket.on('close', () => {
        console.log('🔌 Scale disconnected');
        scaleSocket = null;
    });
});

httpServer.listen(WS_PORT);
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    console.log(`📡 Bridge running. TCP: ${TCP_PORT} | WS: ${WS_PORT}`);
});