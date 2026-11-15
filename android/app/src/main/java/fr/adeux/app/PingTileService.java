package fr.adeux.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/**
 * Tuile « Petit ping » des réglages rapides : envoie une pensée sans ouvrir
 * l'application. Même jeton d'appareil que le widget ; si l'appareil n'est pas
 * associé, la tuile ouvre l'application pour l'association.
 */
public class PingTileService extends TileService {

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onStartListening() {
        super.onStartListening();
        updateTile(
            PingSender.hasCredentials(this)
                ? getString(R.string.widget_ping_hint)
                : getString(R.string.widget_ping_pair)
        );
    }

    @Override
    public void onClick() {
        super.onClick();

        if (!PingSender.hasCredentials(this)) {
            updateTile(getString(R.string.widget_ping_pair));
            openApp();
            return;
        }

        updateTile(getString(R.string.widget_ping_sending));
        final Context app = getApplicationContext();

        new Thread(() -> {
            final PingSender.Result result = PingSender.send(app);
            mainHandler.post(() -> {
                updateTile(PingSender.message(app, result));
                if (result == PingSender.Result.NOT_PAIRED
                    || result == PingSender.Result.UNAUTHORIZED) {
                    openApp();
                }
            });
        }).start();
    }

    private void updateTile(String subtitle) {
        Tile tile = getQsTile();
        if (tile == null) return;

        tile.setLabel(getString(R.string.widget_ping_title));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.setSubtitle(subtitle);
        }
        tile.setState(Tile.STATE_INACTIVE);
        tile.updateTile();
    }

    private void openApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        if (Build.VERSION.SDK_INT >= 34) {
            PendingIntent pending = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            startActivityAndCollapse(pending);
        } else {
            startActivityAndCollapse(intent);
        }
    }
}
