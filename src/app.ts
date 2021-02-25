



import { createAdapter } from 'socket.io-redis';
import { RedisClient } from 'redis';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { RedisAdapter } from 'socket.io-redis';
import { PeerConnectionService } from './Service/PeerConnectionService';


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
    cors: {
        origin: "https://ssl.sngy.io",
        methods: ["GET", "POST"],
        allowedHeaders: ["X-API-Key"],
        credentials: true
    }
});
const pubClient = new RedisClient({
    host: '34.64.121.181', port: 6379, auth_pass: "sngy1234"
});
const subClient = pubClient.duplicate();
io.adapter(createAdapter({ pubClient, subClient }));
//====================================================init_socket_io

export const MEETING_ROOM = "MEETING_ROOM";

export enum SignalFlow {
    MYID = "MYID",
    ROOM = "ROOM",
    CANDIDATE = "CANDIDATE",
    OFFER = "OFFER",
    ANSWER = "ANSWER",
    LEAVE = "LEAVE"
}

export interface Message {
    room?: string,
    target?: string,
    source?: string,
    candidate?: RTCIceCandidate,
    sdp?: RTCSessionDescriptionInit
}

class MainServer {
    constructor() {
        io.on('connection', async (socket: Socket) => {            
            console.log("connected")
            // console.log(socket.handshake.auth)
            const adapter: RedisAdapter = io.of('/').adapter as unknown as RedisAdapter,
                peer = new PeerConnectionService(adapter, socket, io);                
            socket.on(SignalFlow.ROOM, (message: Message) => peer.join_room(message));
            socket.on(SignalFlow.OFFER, (message: Message) => peer.send_offer(message));
            socket.on(SignalFlow.ANSWER, (message: Message) => peer.send_answer(message));
            socket.on(SignalFlow.CANDIDATE, (message: Message) => peer.send_ice_candidate(message));
            socket.on('disconnect', async () => {
                console.log(`${socket.id} disconnected`);
                await peer.broadcastParticipants();
            });
        });
    }
}

const start_app = new MainServer();


