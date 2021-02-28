
import { RedisClient } from 'redis';
import { Server, Socket } from 'socket.io';
import { RedisAdapter } from 'socket.io-redis';
import { MEETING_ROOM, Message, RoomParticipantData, SignalFlow } from './ServerData';
import { promisify } from 'util';


export class PeerConnectionService {

    private _socket: Socket;
    private adapter: RedisAdapter;
    private io: Server;
    private redisClient: RedisClient;

    constructor(adapter: RedisAdapter, socket: Socket, io: Server, redisClient: RedisClient) {
        this._socket = socket;
        this.adapter = adapter;
        this.io = io;
        this.redisClient = redisClient;
    }

    // alarm users if there is any change in the number of participants
    public broadcastParticipants = async () => {
        const getAsync = promisify(this.redisClient.get).bind(this.redisClient),
            sockets = await this.io.of('/').in(MEETING_ROOM).allSockets(),
            arr = Array.from(sockets);
        let participants = await Promise.all(arr.map(async (val, idx) => {
            let name = await getAsync(val);
            console.log(name)
            return {
                name: name,
                socket_id: arr[idx]
            }
        }));
        this.io.to(MEETING_ROOM).emit(MEETING_ROOM, {
            participants
        } as Message);
    }

    // enter name in redis
    public enter_name = async (message: Message) => {
        let name = message.name!;
        this.redisClient.get(name, (err, reply) => {
            if (reply === null) {
                this.redisClient.set(name, this._socket.id);
                this.redisClient.set(this._socket.id, name);
                this._socket.emit(SignalFlow.NAME, {
                    name
                } as Message)
            } else {
                this._socket.emit(SignalFlow.NAME, {
                    name: undefined
                } as Message)

            }
        });



    }

    //===============================================================event listener

    // step 1 - join room
    public join_room = async (message: Message): Promise<void> => {
        await this.adapter.remoteJoin(this.socket.id, MEETING_ROOM);
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