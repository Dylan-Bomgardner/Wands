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
var Sound = require('react-native-sound');

setUpdateIntervalForType(SensorTypes.accelerometer, 70); // defaults to 100ms
setUpdateIntervalForType(SensorTypes.magnetometer, 100);
var i = 0;

NfcManager.start();

const remotePort = 12345;
const remoteHost = '10.203.152.20';

const socket = dgram.createSocket('udp4');

let health = 30;
let block = 0
let blocking = false;

socket.bind(12345);

function playFireballHit() {
  // Enable playback in silence mode
  Sound.setCategory('Playback');

  var whoosh = new Sound('fireball_hit.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('failed to load the sound', error);
      return;
    }
    // loaded successfully
    console.log('duration in seconds: ' + whoosh.getDuration() + 'number of channels: ' + whoosh.getNumberOfChannels());
    // Play the sound with an onEnd callback
    whoosh.play((success) => {
      if (success) {
        console.log('successfully finished playing');
      } else {
        console.log('playback failed due to audio decoding errors');
      }
    });
  });


// Reduce the volume by half
  whoosh.setVolume(1.0);

// Loop indefinitely until stop() is called
  whoosh.setNumberOfLoops(1);

  console.log('volume: ' + whoosh.getVolume());

// Release the audio player resource
  whoosh.release();
}

function playFireballSend() {
  // Enable playback in silence mode
  Sound.setCategory('Playback');

  var whoosh = new Sound('fireball_send.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('failed to load the sound', error);
      return;
    }
    // loaded successfully
    console.log('duration in seconds: ' + whoosh.getDuration() + 'number of channels: ' + whoosh.getNumberOfChannels());
    // Play the sound with an onEnd callback
    whoosh.play((success) => {
      if (success) {
        console.log('successfully finished playing');
      } else {
        console.log('playback failed due to audio decoding errors');
      }
    });

  });


// Reduce the volume by half
  whoosh.setVolume(1.0);

// Loop indefinitely until stop() is called
  whoosh.setNumberOfLoops(1);

  console.log('volume: ' + whoosh.getVolume());

// Release the audio player resource
  whoosh.release();
}
function App() {
  const [fireball, setFireball] = React.useState(0);
  //const [block, setBlock] = React.useState(0);
  const [combat, setCombat] = React.useState(0);
  const [Acceleration, setAcceleration] = React.useState([0, 0, 0])
  const [temp, setTemp] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [heading, setHeading] = React.useState(0);
  const [roll, setRoll] = React.useState(0);
  const [pitch, setPitch] = React.useState(0);
  const [shaking, setShaking] = React.useState(false);
  const [initialAttack, setInitialAttack] = React.useState(false);

  //const [health, setHealth] = React.useState(100);

  const [spellCooldown, setSpellCooldown] = React.useState(0);
  //const [socket, setSocket] = React.useState<TcpSocket.Socket>();
  //const [blocking, setBlocking] = React.useState(false);
  const [dead, setDead] = React.useState(false);
  const [inGame, setInGame] = React.useState(false);
  const [backgroundColor, setBackgroundColor] = React.useState('green');
  const [backgroundOpacity, setBackgroundOpacity] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);

  React.useEffect(() => {

    socket.once('listening', function () {
      socket.on('message', function (msg, rinfo) {
        console.log("message received", msg);
        var bigdata = JSON.parse(msg);
        handleMessage(bigdata);
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
        if (fireball == 0 && pitch >= 50) {
          setBackgroundColor("green");
          setBackgroundOpacity(0.7);
          block = 1;
        }
        break;
      case 1:
        console.log("BLOCKING TRUE");

        blocking = true;
        if (pitch <= 10) {

          blocking = false;
          block = 0;
          console.log("blocking false");
        }
        break;
    }
  }


  function fireballHandler() {
    switch (fireball) {
      case 0:
        if (block == 0 && (roll >= 50)) {
          setFireball(1);
          setBackgroundColor("red");
          setBackgroundOpacity(0.1);
          console.log("Fireball 1");
        }
        break;
      case 1:
        if (block == 0 && roll < 20) {
          setFireball(2);
          setBackgroundOpacity(0.4);
          console.log("Fireball 2");
        }
        break;
      case 2:
        if (block == 0 && pitch > 30) {
          setFireball(3);
          setBackgroundOpacity(0.7);
          console.log("Fireball 3");
        }
        break;
      case 3:
        if (block == 0 && pitch < 10) {
          setFireball(0);
          setBackgroundOpacity(0);
          console.log("FINISHED");
          console.log("HANDLE SENDER HERE");
          attack();

        }
    }
  }
  //Phone: 10.203.168.51
  //Computer:  10.203.154.20

  // Create socket


  async function readNdef() {
    try {
      // register for the NFC tag with NDEF in it
      await NfcManager.requestTechnology(NfcTech.Ndef);
      // the resolved tag object will contain `ndefMessage` property
      const tag = await NfcManager.getTag();
      console.warn('Tag found', tag);
      console.log('Tag found', tag);
    } catch (ex) {
      console.warn('Oops!', ex);
    } finally {
      // stop the nfc scanning
      NfcManager.cancelTechnologyRequest();
    }
  }

  async function writeNdef() {
    let result = false;

    try {
      // STEP 1
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([Ndef.textRecord('Hello NFC')]);

      if (bytes) {
        await NfcManager.ndefHandler // STEP 2
          .writeNdefMessage(bytes); // STEP 3
        result = true;
      }
    } catch (ex) {
      console.warn(ex);
    } finally {
      // STEP 4
      NfcManager.cancelTechnologyRequest();
    }

    return result;
  }

  function handleMessage(data: Message) {

    console.log(data);
    switch (data.type) {
      case "dead":
        setInGame(false);
        setGameOver(true);
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
            health -= damage;
            console.log("You were hit by " + damage + " damage!");
            playFireballHit();
            //send message that you were hit to oppoenent
            if (health <= 0) {
              setDead(true);
              setInGame(false);
              setGameOver(true);
              console.log("You died!");
            }
          }
          Vibration.cancel();
          socket.send(JSON.stringify({ type: "hit", hit: { by: data.spell.type, dead: dead, health: health } }), undefined, undefined, remotePort, remoteHost, function (err) {
            if (err) throw err

            console.log('Message sent!')
          });
        }, 3000);
        break;
      case "hit":
        //hit success
        console.log("Opponent was hit by your " + data.hit.by + "!");
        console.log("Opponent health: " + data.hit.health);
        if (data.hit.dead) {
          console.log("Opponent died!");
          setInGame(false)
          health = 100
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
    socket.send(JSON.stringify({ type: "spell", spell: { type: "fireball", damage: 10, delay: 1000 } }), undefined, undefined, remotePort, remoteHost, function (err) {
      if (err) throw err
      else playFireballSend();
      console.log('Message sent!')
    });
  }

  if (gameOver) {
    return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image style={{ position: "absolute", width: '100%', height: '100%' }} source={{ uri: "https://i.imgur.com/xcBKEXg.png" }} />
        <View style={{ flex: 0.40, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 95, fontFamily: '1up', color: 'white', left: 18 }}>GAME OVER</Text>
        </View>
        <View style={{ flex: 0.1, justifyContent: 'center', alignItems: 'center' }}>
          <Image style={{ position: 'absolute', width: 300, height: 125}} source={{ uri: 'https://i.imgur.com/KFaRBIK.png' }} />
          <TouchableOpacity onPress={() => {
            setGameOver(false);
          }}>
            <Text style={{ fontFamily: "PixelOperator", fontSize: 48, color: 'black' }}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
        <View style={{flex: 0.5}}></View>
    </View>);
  }

  if (inGame) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image style={{ position: "absolute", width: '100%', height: '100%' }} source={{ uri: "https://i.imgur.com/xcBKEXg.png" }} />
        <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: backgroundColor, opacity: backgroundOpacity }}></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'gray' }}>
      <Image style={{ position: "absolute", width: '100%', height: '100%' }} source={{ uri: "https://i.imgur.com/xcBKEXg.png" }} />
      <View style={{ flex: 0.10, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 97, fontFamily: 'alagard', color: '#de9f35' }}>WANDS</Text>
      </View>
      <View style={{ flex: 0.02, justifyContent: 'center', alignItems: 'center' }}></View>
      <View style={{ flex: 0.25, justifyContent: 'center', alignItems: 'center' }}>
        <Image style={{ position: 'absolute', width: 300, height: 125, top: 37 }} source={{ uri: 'https://i.imgur.com/KFaRBIK.png' }} />
        <TouchableOpacity onPress={() => {
          console.log(writeNdef());
          setInGame(true);
        }}>
          <Text style={{ fontFamily: "PixelOperator", fontSize: 48, color: 'black' }}>CHALLENGE</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 0.18, justifyContent: 'center', alignItems: 'center' }}>
        <Image style={{ position: 'absolute', width: 300, height: 125, top: 11 }} source={{ uri: 'https://i.imgur.com/KFaRBIK.png' }} />
        <TouchableOpacity onPress={() => {
          readNdef();
          setInGame(true);
        }}>
          <Text style={{ fontFamily: "PixelOperator", fontSize: 50, color: 'black' }}>ACCEPT</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 0.3, justifyContent: 'center', alignItems: 'center' }}>
        <Image style={{ position: 'absolute', width: 300, height: 125, top: 56 }} source={{ uri: 'https://i.imgur.com/KFaRBIK.png' }} />
        <Text style={{ fontFamily: "PixelOperator", fontSize: 50, color: 'black' }}>LOADOUT</Text>
      </View>
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
