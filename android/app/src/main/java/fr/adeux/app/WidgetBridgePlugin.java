package fr.adeux.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pont JavaScript → widget natif. La WebView confie le jeton d'appareil au
 * stockage privé Android ; le widget peut ensuite envoyer un ping même quand
 * l'application est fermée.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void getPingToken(PluginCall call) {
        SharedPreferences prefs = prefs();
        JSObject result = new JSObject();
        result.put("token", prefs.getString(PingSender.KEY_TOKEN, null));
        call.resolve(result);
    }

    @PluginMethod
    public void savePingToken(PluginCall call) {
        String token = call.getString("token");
        String endpoint = call.getString("endpoint");

        if (token == null || token.isEmpty() || endpoint == null || endpoint.isEmpty()) {
            call.reject("Jeton ou serveur manquant.");
            return;
        }
        if (!endpoint.startsWith("https://") && !endpoint.startsWith("http://")) {
            call.reject("Adresse de serveur invalide.");
            return;
        }

        String normalized = endpoint.replaceAll("/+$", "");
        prefs()
            .edit()
            .putString(PingSender.KEY_TOKEN, token)
            .putString(PingSender.KEY_ENDPOINT, normalized)
            .apply();

        PingWidgetProvider.updateAll(getContext(), getContext().getString(R.string.widget_ping_hint));
        call.resolve();
    }

    @PluginMethod
    public void clearPingToken(PluginCall call) {
        prefs().edit().clear().apply();
        PingWidgetProvider.updateAll(getContext(), getContext().getString(R.string.widget_ping_pair));
        call.resolve();
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PingSender.PREFS, Context.MODE_PRIVATE);
    }
}
