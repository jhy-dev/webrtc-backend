
import { Server, Socket } from 'socket.io';
import { RedisAdapter } from 'socket.io-redis';
import { SignalFlow, Message, MEETING_ROOM } from '../app';

export class PeerConnectionService {

    private _socket: Socket;
    private adapter: RedisAdapter;
    private io: Server;

    constructor(adapter: RedisAdapter, socket: Socket, io: Server) {
        this._socket = socket;
        this.adapter = adapter;
        this.io = io;
    }

    // alarm users if there is any change in the number of participants
    public broadcastParticipants = async () => {
        const sockets = await this.io.of('/').in(MEETING_ROOM).allSockets(),
            arr = Array.from(sockets);
        this.io.to(MEETING_ROOM).emit(SignalFlow.ROOM, {
            participants: arr,
        });
    }

    //===============================================================event listener

    // step 1 - join room
    public join_room = async (message: Message): Promise<void> => {
        await this.adapter.remoteJoin(this.socket.id, MEETING_ROOM);
        this._socket.emit(SignalFlow.MYID, {
            myid: this._socket.id,
        })
        await this.broadcastParticipants();
    };

    // step 2 - call other user
    public send_offer = async (message: Message): Promise<void> => {
        console.log(`offer: ${message.target}/${message.source}`);
        const target = message.target!;
        this._socket.to(target).emit(SignalFlow.OFFER, {
            sdp: message.sdp,
            source: this._socket.id
        } as Message);
    };

    // step 3 - other user sends back the answer
    public send_answer = async (message: Message): Promise<void> => {
        console.log(`answer: ${message.target}/${message.source}`);
        const target = message.target!;
        this._socket.to(target).emit(SignalFlow.ANSWER, {
            sdp: message.sdp,
            source: this._socket.id
        } as Message);
    };

    // step 4 - send icecandidate info
    public send_ice_candidate = async (message: Message): Promise<void> => {
        console.log(`candidate: ${message.target}/${message.source}`);
        const target = message.target!;
        this._socket.to(target).emit(SignalFlow.CANDIDATE, {
            candidate: message.candidate,
            source: this._socket.id
        } as Message);
    };


    //=============================socket
    public get socket(): Socket {
        return this._socket;
    }
    public set socket(value: Socket) {
        this._socket = value;
    }
    //=============================socket



}