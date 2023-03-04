import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';
import {NetworkInfo} from 'react-native-network-info';

// Pre-step, call this before any NFC operations
NfcManager.start();

function App() {
  async function readNdef() {
    try {
      // register for the NFC tag with NDEF in it
      await NfcManager.requestTechnology(NfcTech.Ndef);
      // the resolved tag object will contain `ndefMessage` property
      const tag = await NfcManager.getTag();
      console.warn('Tag found', tag);
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
      const ip = await NetworkInfo.getIPV4Address();
      if( ip == undefined)
      {
        throw new Error("IP not found");
      }
      const bytes = Ndef.encodeMessage([Ndef.textRecord(ip)]);
  
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

  async function test()
  {
    await Promise.race([writeNdef(), readNdef()]);
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={test}>
        <Text>Scan a Tag</Text>
      </TouchableOpacity>
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
