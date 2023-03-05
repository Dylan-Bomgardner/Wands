import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';
import {NetworkInfo} from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';
// Pre-step, call this before any NFC operations
import SensorView from "./SensorView";
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes
} from "react-native-sensors";
import { map, filter } from "rxjs/operators";
setUpdateIntervalForType(SensorTypes.accelerometer, 400); // defaults to 100ms



NfcManager.start();

function App() {

  const [temp, setTemp] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [heading, setHeading] = React.useState(0);
  const [roll, setRoll] = React.useState(0);
  const [pitch, setPitch] = React.useState(0);
  const [shaking, setShaking] = React.useState(false);

  const [health, setHealth] = React.useState(100);
  const [spellCooldown, setSpellCooldown] = React.useState(0);
  const [socket, setSocket] = React.useState<TcpSocket.Socket>();
  const [blocking, setBlocking] = React.useState(false);
  
  function handleMessage(data: string, 
    setOpponentHealthVisual: (health: number) => void,
    writeSocket: (data: string) => void) {
    let data_json = JSON.parse(data);
    if (data_json.msg_type === "attack") {
      if ("damage" in data_json.effects) {
        setTimeout(() => {
          if(!blocking)
          {
            setHealth(health - data_json.effects.damage);
            console.log("You were hit by " + data_json.effects.damage + " damage!");
          }
          else
          {
            
          }       
        }, 1000);
      }
    }
    else if (data_json.msg_type === "hit_notif") {
      console.log("Opponent was hit by your " + data_json.what_hit + "!");
    }
    else if (data_json.msg_type === "health_notif") {
      setOpponentHealthVisual(data_json.new_health);
    }
  }
  async function readNdef() {
    if(connected)
    {
      console.warn("Already connected");
      return;
    }

    try {
      let tag: any
      // the resolved tag object will contain `ndefMessage` property
      tag = await NfcManager.requestTechnology(NfcTech.Ndef); // STEP 1
      console.warn('Tag found', tag);
      if(tag == undefined)
      {
        throw new Error("Tag not found");
      }
      const decodedData = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
      console.warn('decodedData', decodedData);
      setTemp(decodedData);
    } catch (ex) {
      console.warn('Oops!', ex);
    }
    finally
    {
      await NfcManager.cancelTechnologyRequest();
    }

    const options = {
      port: 5000,
      host: temp, //needs to be ip from the other device
      localAddress: '127.0.0.1',
      reuseAddress: true,
    };
    const client = TcpSocket.createConnection(options, () => {
      // Write on the socket
      client.write('Hello server!');
      setConnected(true);
      // Close socket
    });

    client.on('data', function(data) {
      console.log('message was received', data);

      if(data == "Please Close")
      {
        client.destroy();
      }
      else
      {
        const info = JSON.parse(data.toString());
        console.log(info);
      }
    });
    
    client.on('error', function(error) {
      console.log(error);
    });
    
    client.on('close', function(){
      console.log('Connection closed!');
      setConnected(false);
    });


  }
  
  async function writeNdef() {
    let result = false;
    if(connected)
    {
      console.warn("Already connected");
      return;
    }
    try {
      const ip = await NetworkInfo.getIPV4Address();
      if( ip == undefined)
      {
        throw new Error("IP not found");
      }    
      const bytes = Ndef.encodeMessage([Ndef.textRecord(ip)]);
  
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes); // STEP 3
        result = true;
      }
    } catch (ex) {
      console.warn(ex);
    }
    finally
    {
      await NfcManager.cancelTechnologyRequest();
    }
  
    const server = TcpSocket.createServer(function(socket) {
      setSocket(socket);
      socket.on('data', (data) => {
        socket.write('Echo server ' + data);
        setConnected(true);
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
  const axis = ["x", "y", "z"];
  const availableSensors = {
    accelerometer: axis,
    gyroscope: axis,
    magnetometer: axis,
    barometer: ["pressure"],
  };
  const accel = accelerometer.subscribe(({x, y, z, timestamp}) =>
    console.log({x, y, z, timestamp})
  );
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={writeNdef}>
        <Text>Attack</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={readNdef}>
        <Text>{Object.entries(availableSensors).map(([name, values]) => (
          <SensorView key={name} sensorName={name} values={values}  /> ))}
        </Text>
      </TouchableOpacity>
      <Text>{}</Text>
      <Text>{temp}</Text>
      <Text>{connected ? "Connected" : "Not Connected"}</Text>
    </View>
  );
}





const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
