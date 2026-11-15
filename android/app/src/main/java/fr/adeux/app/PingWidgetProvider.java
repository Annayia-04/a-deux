package fr.adeux.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Widget « Petit ping » : envoie une pensée au partenaire sans ouvrir
 * l'application. Le jeton d'appareil est remis par la WebView via
 * WidgetBridgePlugin et stocké dans les préférences privées de l'app.
 */
public class PingWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_PING = "fr.adeux.app.action.WIDGET_PING";

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
                PingSender.Result result = PingSender.send(app);
                if (result == PingSender.Result.NOT_PAIRED) {
                    PingSender.openApp(app);
                }
                updateAll(app, PingSender.message(app, result));
            } finally {
                pending.finish();
            }
        }).start();
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
