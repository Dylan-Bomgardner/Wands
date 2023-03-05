import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Image } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NetworkInfo } from 'react-native-network-info';
import TcpSocket from 'react-native-tcp-socket';
// Pre-step, call this before any NFC operations
import SensorView from "./SensorView";
import { HCESession, NFCTagType4NDEFContentType, NFCTagType4 } from 'react-native-hce';
import { createTcpClient, createTcpServer, Message } from './tcp';




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
  const [dead, setDead] = React.useState(false);

  async function readNdef() {
    if (connected) {
      console.warn("Already connected");
      return;
    }

    // try {
    //   let tag: any
    //   // the resolved tag object will contain `ndefMessage` property
    //   await NfcManager.requestTechnology(NfcTech.Ndef); // STEP 1
    //   tag = await NfcManager.getTag(); // STEP 2
    //   console.warn('Tag found', tag);
    //   if (tag == undefined) {
    //     throw new Error("Tag not found");
    //   }
    //   const decodedData = String.fromCharCode(...tag.ndefMessage[0].payload);

    //   console.warn('decodedData', decodedData);
    //   setTemp(decodedData);
    //   setSocket(createTcpClient(temp, setConnected, handleMessage));
    // } catch (ex) {
    //   console.warn('Oops!', ex);
    // }
    // finally {
    //   NfcManager.cancelTechnologyRequest();
    // }
    setSocket(createTcpClient("10.203.154.20", setConnected, handleMessage));

  }

  async function writeNdef() {
    let result = false;
    if (connected) {
      console.warn("Already connected");
      return;
    }
    createTcpServer(setConnected, setSocket, handleMessage);

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
    setTimeout(() => {
      setSpellCooldown(0);
    }, 5000);
    socket?.write(JSON.stringify({ type: "spell", spell: { type: "fireball", damage: 10, delay: 1000 } }));
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
    /*
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
    */
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
