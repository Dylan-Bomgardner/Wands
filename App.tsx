import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NetworkInfo } from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';
// Pre-step, call this before any NFC operations
import SensorView from "./SensorView";
import { HCESession, NFCTagType4NDEFContentType, NFCTagType4 } from 'react-native-hce';
import { createTcpClient, createTcpServer, Message } from './tcp';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes
} from "react-native-sensors";
import { map, filter } from "rxjs/operators";
import { HceTools } from 'react-native-nfc-sdk';
setUpdateIntervalForType(SensorTypes.accelerometer, 400); // defaults to 100ms




NfcManager.start();

function App() {
  const hce = new HceTools();
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
  const [dead, setDead] = React.useState(false);

  async function readNdef() {
    if (connected) {
      console.warn("Already connected");
      return;
    }

    try {
      let tag: any
      // the resolved tag object will contain `ndefMessage` property
      await NfcManager.requestTechnology(NfcTech.Ndef); // STEP 1
      tag = await NfcManager.getTag(); // STEP 2
      console.warn('Tag found', tag);
      if (tag == undefined) {
        throw new Error("Tag not found");
      }
      const decodedData = String.fromCharCode(...tag.ndefMessage[0].payload);

      console.warn('decodedData', decodedData);
      setTemp(decodedData);
      setSocket(createTcpClient(temp, setConnected, handleMessage));
    } catch (ex) {
      console.warn('Oops!', ex);
    }
    finally {
      NfcManager.cancelTechnologyRequest();
    }

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

      const listen = async () => {
        const removeListener = session.on(HCESession.Events.HCE_STATE_READ, async () => {
          console.log("HCE_STATE_READ");
          await session.setEnabled(false);
          createTcpServer(setConnected, setSocket, handleMessage);
        });
        
        // to remove the listener:
        removeListener();
        console.log("Listening for HCE_STATE_READ");
      }
      let session: HCESession;

      const tag = new NFCTagType4({
        type: NFCTagType4NDEFContentType.Text,
        content: "AHAAHAHAH",
        writable: false
      });

      session = await HCESession.getInstance();
      session.setApplication(tag);
      await session.setEnabled(true);
      listen();
    } catch (ex) {
      console.warn(ex);
    }
    finally {

    }

  }

  function handleMessage(data: Message) {
    switch (data.type) {
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
              console.log("You died!");
            }
          }
          Vibration.cancel();
          socket?.write(JSON.stringify({ type: "hit", hit: { health: health, by: data.spell.type, dead: dead } }));
        }, data.spell.delay);
        break;
      case "hit":
        //hit success
        console.log("Opponent was hit by your " + data.hit.by + "!");
        console.log("Opponent health: " + data.hit.health);
        if (data.hit.dead) {
          console.log("Opponent died!");
          socket?.destroy();
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
    setSpellCooldown(5);
    socket?.write(JSON.stringify({ type: "spell", spell: { type: "fireball", damage: 10, delay: 1000 } }));
  }
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={writeNdef}>
        <Text>Write</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={readNdef}>
        <Text>Read</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={attack}>
        <Text>Attack</Text>
      </TouchableOpacity>
      <Text>{temp}</Text>
      <Text>{connected ? "Connected" : "Not Connected"}</Text>
    </View>
  );
}





const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    fontSize: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
