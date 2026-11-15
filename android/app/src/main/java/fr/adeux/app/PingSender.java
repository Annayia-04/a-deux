package fr.adeux.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Envoi d'un « petit ping » depuis un composant natif (widget ou tuile des
 * réglages rapides). Le jeton et l'URL du serveur sont ceux remis par la
 * WebView via WidgetBridgePlugin.
 */
public final class PingSender {

    public static final String PREFS = "adeux_widget";
    public static final String KEY_TOKEN = "token";
    public static final String KEY_ENDPOINT = "endpoint";

    public enum Result {
        SENT,
        WAITING,
        UNAUTHORIZED,
        INCOMPLETE,
        OFFLINE,
        ERROR,
        NOT_PAIRED
    }

    private PingSender() {
    }

    public static boolean hasCredentials(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String token = prefs.getString(KEY_TOKEN, null);
        String endpoint = prefs.getString(KEY_ENDPOINT, null);
        return token != null && !token.isEmpty()
            && endpoint != null && !endpoint.isEmpty();
    }

    public static Result send(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String token = prefs.getString(KEY_TOKEN, null);
        String endpoint = prefs.getString(KEY_ENDPOINT, null);

        if (token == null || token.isEmpty() || endpoint == null || endpoint.isEmpty()) {
            return Result.NOT_PAIRED;
        }

        HttpURLConnection connection = null;
        try {
            URL url = new URL(endpoint + "/api/widget/ping");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Accept", "application/json");
            connection.setFixedLengthStreamingMode(0);
            connection.getOutputStream().close();

            int status = connection.getResponseCode();
            if (status == 201) return Result.SENT;
            if (status == 429) return Result.WAITING;
            if (status == 401) return Result.UNAUTHORIZED;
            if (status == 409) return Result.INCOMPLETE;
            if (status == 503) return Result.ERROR;
            return Result.ERROR;
        } catch (Exception error) {
            return Result.OFFLINE;
        } finally {
            if (connection != null) {
                try {
                    InputStream stream = connection.getErrorStream();
                    if (stream != null) stream.close();
                } catch (Exception ignored) {
                    // Rien à récupérer : le statut suffit.
                }
                connection.disconnect();
            }
        }
    }

    public static String message(Context context, Result result) {
        switch (result) {
            case SENT:
                return context.getString(R.string.widget_ping_sent);
            case WAITING:
                return context.getString(R.string.widget_ping_wait);
            case UNAUTHORIZED:
                return context.getString(R.string.widget_ping_unauthorized);
            case INCOMPLETE:
                return context.getString(R.string.widget_ping_incomplete);
            case OFFLINE:
                return context.getString(R.string.widget_ping_offline);
            case NOT_PAIRED:
                return context.getString(R.string.widget_ping_pair);
            case ERROR:
            default:
                return context.getString(R.string.widget_ping_error);
        }
    }

    /** Ouvre l'application : association initiale ou jeton révoqué. */
    public static void openApp(Context context) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
    }
}
