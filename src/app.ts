



import { createAdapter } from 'socket.io-redis';
import { RedisClient } from 'redis';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { RedisAdapter } from 'socket.io-redis';
import { PeerConnectionService } from './lib/PeerConnectionService';
import { Message, SignalFlow } from './lib/ServerData';


//====================================================health_check
const PORT = 5000;
const app = express();
const server = http.createServer(app);
app.get('/health_check', (req, res, next) => { res.status(200).send("health_check successful!") });
server.listen(PORT, () => {
    console.log(`server starting on PORT: ${PORT}`);
});
//====================================================health_check

//====================================================init_socket_io
const io = new Server(server, {
    transports: ["websocket"],
    // cors: {
    // origin: "https://webrtc.front",
    // allowedHeaders: ["X-API-Key"],
    // methods: ["GET", "POST"],
    // credentials: true
    // }
});
const pubClient = new RedisClient({
    host: '127.0.0.1', port: 6379, auth_pass: "test123"
});
const subClient = pubClient.duplicate();
io.adapter(createAdapter({ pubClient, subClient }));
//====================================================init_socket_io

class MainServer {
    constructor() {
        io.on('connection', async (socket: Socket) => {
            console.log("connected")
            // console.log(socket.handshake.auth)
            const adapter: RedisAdapter = io.of('/').adapter as unknown as RedisAdapter,
                peer = new PeerConnectionService(adapter, socket, io, pubClient);
            socket.on(SignalFlow.NAME, (message: Message) => peer.enter_name(message));
            socket.on(SignalFlow.ROOM, (message: Message) => peer.join_room(message));
            socket.on(SignalFlow.OFFER, (message: Message) => peer.send_offer(message));
            socket.on(SignalFlow.ANSWER, (message: Message) => peer.send_answer(message));
            socket.on(SignalFlow.CANDIDATE, (message: Message) => peer.send_ice_candidate(message));
            socket.on('disconnect', async () => {
                pubClient.get(socket.id, (name_err, name) => {
                    if (name !== null) {
                        pubClient.del(name);
                        pubClient.del(socket.id);
                    }
                });
                console.log(`${socket.id} disconnected`);
                await peer.broadcastParticipants();
            });
        });
    }
}

const start_app = new MainServer();


