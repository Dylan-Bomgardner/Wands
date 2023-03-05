package com.wands;

import android.content.Context;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import com.reactnativehce.IHCEApplication;
import com.reactnativehce.apps.nfc.NFCTagType4;
import com.reactnativehce.managers.HceViewModel;
import com.reactnativehce.managers.PrefManager;
import com.reactnativehce.utils.ApduHelper;

import java.util.ArrayList;

public class NFCEmulator extends HostApduService {
    private static final String TAG = "CardService";

    private final ArrayList<IHCEApplication> registeredHCEApplications = new ArrayList<>();
    private IHCEApplication currentHCEApplication = null;

    @Override
    public byte[] processCommandApdu(byte[] command, Bundle extras) {
        if (currentHCEApplication != null) {
            return currentHCEApplication.processCommand(command);
        }

        if (ApduHelper.commandByRangeEquals(command, 0, 4, ApduHelper.C_APDU_SELECT_APP)) {
            for (IHCEApplication app : registeredHCEApplications) {
                if (app.assertSelectCommand(command)) {
                    currentHCEApplication = app;
                    return ApduHelper.R_APDU_OK;
                }
            }
        }

        return ApduHelper.R_APDU_ERROR;
    }

    @Override
    public void onCreate() {
        Log.d(TAG, "Starting service");
        Context context = getApplicationContext();

        registeredHCEApplications.add(new NFCTagType4(
                PrefManager.getInstance(context),
                HceViewModel.getInstance(context)
        ));
    }

    @Override
    public void onDeactivated(int reason) {
        Log.d(TAG, "Finishing service: " + reason);
        this.currentHCEApplication.onDestroy(reason);
    }
}
