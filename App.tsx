import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Vibration, TouchableHighlight } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NetworkInfo } from 'react-native-network-info';
//import TcpSocket from 'react-native-tcp-socket';
// Pre-step, call this before any NFC operations
import SensorView from "./SensorView";
import Shake from 'react-native-shake';
import dgram from 'react-native-udp';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes,
  magnetometer
} from "react-native-sensors";
import { map, filter } from "rxjs/operators";
import { createTcpClient, createTcpServer, Message } from './tcp';
setUpdateIntervalForType(SensorTypes.accelerometer, 70); // defaults to 100ms
setUpdateIntervalForType(SensorTypes.magnetometer, 100);
var i = 0;

const remotePort = 12345;
const remoteHost = '10.0.2.16';

const socket = dgram.createSocket('udp4');

socket.bind(12345);

function App() {

  const [fireball, setFireball] = React.useState(0);
  const [block, setBlock] = React.useState(0);
  const [combat, setCombat] = React.useState(0);
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
  //const [socket, setSocket] = React.useState<TcpSocket.Socket>();
  const [blocking, setBlocking] = React.useState(false);
  const [dead, setDead] = React.useState(false);
  const [inGame, setInGame] = React.useState(false);
  const [backgroundColor, setBackgroundColor] = React.useState('green')
  const [backgroundOpacity, setBackgroundOpacity] = React.useState(0);
    
  React.useEffect(() => {
    
    socket.once('listening', function () {
      socket.on('message', function(msg, rinfo) {
        console.log("message received", msg);
        handleMessage(msg);
      });
    })
  }, []);

  // socket.send("hello", undefined, undefined, remotePort, remoteHost, function(err) {
  //   if (err) throw err       
  //   console.log('Message sent!')
  // });
  
  
 

  

  

  React.useEffect(() => {
    const subscription = accelerometer.subscribe(({ x, y, z }) => {  
      blockHandler();
      fireballHandler();
      combatHandler();
      setRoll(Math.atan2(-x, Math.sqrt(y * y + z * z)) * 180 / Math.PI);
      setPitch(Math.atan2(y, z) * 180 / Math.PI);
    });
    return () => subscription.unsubscribe();
  })
  //1618

  function combatHandler() {
    
  }

  function blockHandler() {
    switch (block) {
      case 0:
        setBackgroundOpacity(0);
        if(fireball == 0 && pitch >= 50) {
          setBackgroundColor("green");
          setBackgroundOpacity(0.7);
          setBlock(1);
        }
        break;
      case 1:
        //console.log("BLOCKING TRUE");
        //setBlocking(true);
        if(pitch <= 10) {
          
          setBlock(0);
        }
        break;
    }
  }

  
  function fireballHandler() {
      switch (fireball) {
        case 0:
          if(block == 0 && (roll >= 50)) {
            setFireball(1);
            setBackgroundColor("red");
            setBackgroundOpacity(0.1);
            console.log("Fireball 1");
          }
          break;
        case 1:
          if(block == 0 && roll < 20) {
            setFireball(2);
            setBackgroundOpacity(0.4);
            console.log("Fireball 2");
          }
          break;
        case 2: 
          if(block == 0 && pitch > 30) {
            setFireball(3);
            setBackgroundOpacity(0.7);
            console.log("Fireball 3");
          }
          break;
        case 3:
          if(block == 0 && pitch < 10) {
            setFireball(0);
            setBackgroundOpacity(0);
            console.log("FINISHED");
            console.log("HANDLE SENDER HERE");
            attack();

          }
      }
  }
//Phone: 128.138.65.94
//Computer:  10.203.154.20

// Create socket











async function readNdef() {
  //setSocket(createTcpClient("128.138.65.94", setConnected, handleMessage));
}

async function writeNdef() {
  
  //setSocket(createTcpServer(setConnected, setSocket, handleMessage));
}

function handleMessage(data: Message) {
  var bigdata = JSON.parse(data);
  
  console.log(bigdata.type);
  switch (bigdata.type) {
    case "dead":
      setInGame(false);
    case "spell":
      let damage = 0;
      switch (data.spell.type) {
        case "fireball":
          damage = data.spell.damage;
          break;
      }
      Vibration.vibrate();
      setTimeout(() => {
        if (!blocking) {
          setHealth(health - damage);
          console.log("You were hit by " + damage + " damage!");
          //send message that you were hit to oppoenent
          if (health <= 0) {
            setDead(true);
            setInGame(false);
            console.log("You died!");
            socket.send(JSON.stringify({ type: "dead", isDead: true }), undefined, undefined, remotePort, remoteHost, function(err) {
              if (err) throw err
          
              console.log('Message sent!')
            });
          }
        }
        Vibration.cancel();
       //socket.send(JSON.stringify({ type: "hit", hit: { health: health, by: data.spell.type, dead: dead } }));
      }, data.spell.delay);
      break;
    case "hit":
      //hit success
      console.log("Opponent was hit by your " + data.hit.by + "!");
      console.log("Opponent health: " + data.hit.health);
      if (data.hit.dead) {
        console.log("Opponent died!");
        //socket?.destroy();
      }
      break;
    case "start":
      console.log("Game started!");
      break;
  }
}

function attack() {
  if (spellCooldown > 0) {
    console.log("Spell on cooldown!");
    return;
  }
  setTimeout(() => {
    setSpellCooldown(0);
  }, 5000);
  socket.send(JSON.stringify({ type: "spell", spell: { type: "fireball", damage: 10, delay: 1000 } }), undefined, undefined, remotePort, remoteHost, function(err) {
    if (err) throw err

    console.log('Message sent!')
  });
}

if (inGame) {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Image style={{position: "absolute", width:'100%', height:'100%'}} source={{uri: "https://i.imgur.com/xcBKEXg.png"}}/>
      <View style={{flex: 1, width: '100%', height: '100%', backgroundColor: backgroundColor, opacity: backgroundOpacity}}></View>
    </View>
  );
}

return (
  <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'gray'}}>
            <Image style={{position: "absolute", width:'100%', height:'100%'}} source={{uri: "https://i.imgur.com/xcBKEXg.png"}}/>
            <View style={{flex:0.10, justifyContent:'center', alignItems:'center'}}>
                <Text style={{fontSize:97, fontFamily: 'alagard', color:'#de9f35'}}>WANDS</Text>
            </View>
            <View style={{flex:0.02, justifyContent:'center', alignItems:'center'}}></View>
            <View style={{flex:0.25, justifyContent:'center', alignItems:'center'}}>
                <Image style={{position:'absolute', width: 300, height:125, top:37}} source={{uri: 'https://i.imgur.com/KFaRBIK.png'}}/>
                <TouchableOpacity onPress={() => {
                  setInGame(true);
                  writeNdef();
                 }}>
                   <Text style={{fontFamily:"PixelOperator", fontSize:48, color:'black'}}>CHALLENGE</Text>
              </TouchableOpacity>
            </View>
            <View style={{flex:0.18, justifyContent:'center', alignItems:'center'}}>
                <Image style={{position:'absolute', width: 300, height:125, top:11}} source={{uri: 'https://i.imgur.com/KFaRBIK.png'}}/>
                <TouchableOpacity onPress={() => {
                  setInGame(true);
                  readNdef();
                 }}>
                  <Text style={{fontFamily:"PixelOperator", fontSize:50, color:'black'}}>ACCEPT</Text>
                </TouchableOpacity>
            </View>
            <View style={{flex:0.3, justifyContent:'center', alignItems:'center'}}>
            <Image style={{position:'absolute', width: 300, height:125, top:56}} source={{uri: 'https://i.imgur.com/KFaRBIK.png'}}/>
                <Text style={{fontFamily:"PixelOperator", fontSize:50, color:'black'}}>LOADOUT</Text>
            </View>
        </View>
  
);
}


/*


const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
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
*/




const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
