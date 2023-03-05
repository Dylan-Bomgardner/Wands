package com.wands;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;


public class NFCEmulation extends ReactContextBaseJavaModule {
    public NFCEmulation(ReactApplicationContext context) {
            super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "NFCEmulation";
    }


}
