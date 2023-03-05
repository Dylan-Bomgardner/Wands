import TcpSocket from 'react-native-tcp-socket';

//typescript object from json in handle message
export interface Message {
    type: string;
    spell: {
        type: string;
        damage: number;
        multiplier: number;
        delay: number;
    },
    hit:
    {
        health: number;
        by: string;
        dead: boolean;
    },
    start: {
        health: number;
    }
};

//function that craetes tcp client
export const createTcpClient = (ip: string, setConnected: (value: boolean) => void, handleData: (data: Message) => void) => {
    const options = {
        port: 5000,
        host: ip, //needs to be ip from the other device
        localAddress: '127.0.0.1',
        reuseAddress: true,
    };
    const client = TcpSocket.createConnection(options, () => {
        // Write on the socket
        client.write('Hello server!');
        setConnected(true);
        // Close socket
    });

    client.on('data', function (data) {
        console.log('message was received', data);
        const info = JSON.parse(data.toString());
        console.log(info);
        handleData(info);
    });

    client.on('error', function (error) {
        console.log(error);
    });

    client.on('close', function () {
        console.log('Connection closed!');
        setConnected(false);
    });
    return client;
}

export const createTcpServer = (setConnected: (value: boolean) => void, setSocket: (value: TcpSocket.Socket) => void, handleData: (data: Message) => void) => {

    const server = TcpSocket.createServer(function (socket) {
        setSocket(socket);
        socket.on('connect', () => {
            console.log('Connected to client');
            setConnected(true);
        });
        socket.on('data', (data) => {
            console.log('Received data from client', data);
            const info = JSON.parse(data.toString());
            handleData(info);
        });

        socket.on('error', (error) => {
            console.log('An error ocurred with client socket ', error);
        });

        socket.on('close', (error) => {
            console.log('Closed connection with ', socket.address());
            server.close();
        });
    }).listen({ port: 5000, host: '0.0.0.0' });

    server.on('error', (error) => {
        console.log('An error ocurred with the server', error);
    });

    server.on('close', () => {
        console.log('Server closed connection');
        setConnected(false);
    });
}