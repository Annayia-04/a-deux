package fr.adeux.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Widget « Petit ping » : envoie une pensée au partenaire sans ouvrir
 * l'application. Le jeton d'appareil est remis par la WebView via
 * WidgetBridgePlugin et stocké dans les préférences privées de l'app.
 */
public class PingWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_PING = "fr.adeux.app.action.WIDGET_PING";
    public static final String PREFS = "adeux_widget";
    public static final String KEY_TOKEN = "token";
    public static final String KEY_ENDPOINT = "endpoint";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        String hint = context.getString(R.string.widget_ping_hint);
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context, hint));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (!ACTION_PING.equals(intent.getAction())) {
            return;
        }

        final PendingResult pending = goAsync();
        final Context app = context.getApplicationContext();
        new Thread(() -> {
            try {
                updateAll(app, sendPing(app));
            } finally {
                pending.finish();
            }
        }).start();
    }

    private static String sendPing(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String token = prefs.getString(KEY_TOKEN, null);
        String endpoint = prefs.getString(KEY_ENDPOINT, null);

        if (token == null || token.isEmpty() || endpoint == null || endpoint.isEmpty()) {
            openApp(context);
            return context.getString(R.string.widget_ping_pair);
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
            if (status == 201) return context.getString(R.string.widget_ping_sent);
            if (status == 429) return context.getString(R.string.widget_ping_wait);
            if (status == 401) return context.getString(R.string.widget_ping_unauthorized);
            if (status == 409) return context.getString(R.string.widget_ping_incomplete);
            if (status == 503) return context.getString(R.string.widget_ping_error);
            return context.getString(R.string.widget_ping_error);
        } catch (Exception error) {
            return context.getString(R.string.widget_ping_offline);
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

    private static void openApp(Context context) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
    }

    public static void updateAll(Context context, String subtitle) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(
            new ComponentName(context, PingWidgetProvider.class)
        );
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context, subtitle));
        }
    }

    private static RemoteViews buildViews(Context context, String subtitle) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ping);
        views.setTextViewText(R.id.widget_subtitle, subtitle);

        Intent intent = new Intent(context, PingWidgetProvider.class);
        intent.setAction(ACTION_PING);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pending);
        return views;
    }
}
