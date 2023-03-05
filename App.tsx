import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NetworkInfo } from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';
// Pre-step, call this before any NFC operations
import SensorView from "./SensorView";
import Shake from 'react-native-shake';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes,
  magnetometer
} from "react-native-sensors";
import { map, filter } from "rxjs/operators";
setUpdateIntervalForType(SensorTypes.accelerometer, 70); // defaults to 100ms
setUpdateIntervalForType(SensorTypes.magnetometer, 100);
var i = 0;

NfcManager.start();








function App() {

  const [fireball, setFireball] = React.useState(0);
  const [block, setBlock] = React.useState(0);
  const [Acceleration, setAcceleration] = React.useState([0, 0, 0])
  const [temp, setTemp] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [heading, setHeading] = React.useState(0);
  const [roll, setRoll] = React.useState(0);
  const [pitch, setPitch] = React.useState(0);
  const [shaking, setShaking] = React.useState(false);
  const [initialAttack, setInitialAttack] = React.useState(false);

  const [health, setHealth] = React.useState(100);
  const [spellCooldown, setSpellCooldown] = React.useState(0);
  const [socket, setSocket] = React.useState<TcpSocket.Socket>();
  const [blocking, setBlocking] = React.useState(false);
  


  useEffect(() => {
    const subscription = accelerometer.subscribe(({ x, y, z }) => {  
      blockHandler();
      fireballHandler();
      setRoll(Math.atan2(-x, Math.sqrt(y * y + z * z)) * 180 / Math.PI);
      setPitch(Math.atan2(y, z) * 180 / Math.PI);
    });
    return () => subscription.unsubscribe();
  })
  //1618

  function blockHandler() {
    switch (block) {
      case 0:
        if(fireball == 0 && pitch >= 50) {
          setBlock(1);
        }
        break;
      case 1:
        setBlock(0);
        console.log("BLOCK HANDLER HERE");
        break;
    }
  }

  function fireballHandler() {
      switch (fireball) {
        case 0:
          if(block == 0 && (roll >= 50)) {
            setFireball(1);
            console.log("Fireball 1");
          }
          break;
        case 1:
          if(block == 0 && roll < 20) {
            setFireball(2);
            console.log("Fireball 2");
          }
          break;
        case 2: 
          if(block == 0 && pitch > 30) {
            setFireball(3);
            console.log("Fireball 3");
          }
          break;
        case 3:
          if(block == 0 && pitch < 10) {
            setFireball(0);
            console.log("FINISHED");
            console.log("HANDLE SENDER HERE");

          }
      }
  }

  

function handleMessage(data: string,
  setOpponentHealthVisual: (health: number) => void,
  writeSocket: (data: string) => void) {
  let data_json = JSON.parse(data);
  if (data_json.msg_type === "attack") {
    if ("damage" in data_json.effects) {
      setTimeout(() => {
        if (!blocking) {
          setHealth(health - data_json.effects.damage);
          console.log("You were hit by " + data_json.effects.damage + " damage!");
        }
        else {

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
  if (connected) {
    console.warn("Already connected");
    return;
  }

  try {
    let tag: any
    // the resolved tag object will contain `ndefMessage` property
    tag = await NfcManager.requestTechnology(NfcTech.Ndef); // STEP 1
    console.warn('Tag found', tag);
    if (tag == undefined) {
      throw new Error("Tag not found");
    }
    const decodedData = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
    console.warn('decodedData', decodedData);
    setTemp(decodedData);
  } catch (ex) {
    console.warn('Oops!', ex);
  }
  finally {
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

  client.on('data', function (data) {
    console.log('message was received', data);

    if (data == "Please Close") {
      client.destroy();
    }
    else {
      const info = JSON.parse(data.toString());
      console.log(info);
    }
  });

  client.on('error', function (error) {
    console.log(error);
  });

  client.on('close', function () {
    console.log('Connection closed!');
    setConnected(false);
  });


}

async function writeNdef() {
  let result = false;
  if (connected) {
    console.warn("Already connected");
    return;
  }
  try {
    const ip = await NetworkInfo.getIPV4Address();
    if (ip == undefined) {
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
  finally {
    await NfcManager.cancelTechnologyRequest();
  }

  const server = TcpSocket.createServer(function (socket) {
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
return (
  <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'gray'}}>
            <Image style={{position: "absolute", width:'100%', height:'100%'}} source={{uri: "https://i.imgur.com/xcBKEXg.png"}}/>
            <View style={{flex:0.10, justifyContent:'center', alignItems:'center'}}>
                <Text style={{fontSize:97, fontFamily: 'alagard', color:'#de9f35'}}>WANDS</Text>
            </View>
            <View style={{flex:0.02, justifyContent:'center', alignItems:'center'}}>

            </View>
            <View style={{flex:0.25, justifyContent:'center', alignItems:'center'}}>
                <Image style={{position:'absolute', width: 300, height:125, top:37}} source={{uri: 'https://i.imgur.com/KFaRBIK.png'}}/>
                <Text style={{fontFamily:"PixelOperator", fontSize:48, color:'black'}}>CHALLENGE</Text>
            </View>
            <View style={{flex:0.18, justifyContent:'center', alignItems:'center'}}>
                <Image style={{position:'absolute', width: 300, height:125, top:11}} source={{uri: 'https://i.imgur.com/KFaRBIK.png'}}/>
                <Text style={{fontFamily:"PixelOperator", fontSize:50, color:'black'}}>ACCEPT</Text>
            </View>
            <View style={{flex:0.3, justifyContent:'center', alignItems:'center'}}>
            <Image style={{position:'absolute', width: 300, height:125, top:56}} source={{uri: 'https://i.imgur.com/KFaRBIK.png'}}/>
                <Text style={{fontFamily:"PixelOperator", fontSize:50, color:'black'}}>LOADOUT</Text>
            </View>
        </View>
  
);

/* (<View style={styles.wrapper}>
    <TouchableOpacity onPress={writeNdef}>
      <Text>Attack</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={readNdef}>
      <Text>
        Pitch: {pitch}, Roll: {roll}
      </Text>
      { <Text>{Object.entries(availableSensors).map(([name, values]) => (
          <SensorView key={name} sensorName={name} values={values}  /> ))}
        </Text> }
        </TouchableOpacity>
        <Text>{ }</Text>
        <Text>{temp}</Text>
        <Text>{connected ? "Connected" : "Not Connected"}</Text>
      </View> 
   ) */
}





const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
