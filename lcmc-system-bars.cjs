// Installe la correction Android lors du même cap sync que le widget existant.
const fs = require('node:fs');
const path = require('node:path');
if (process.env.CAPACITOR_PLATFORM_NAME && process.env.CAPACITOR_PLATFORM_NAME !== 'android') process.exit(0);
const root = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
if (config.appId !== 'fr.lcmc.mesheures' || config.android?.adjustMarginsForEdgeToEdge !== 'disable') {
  throw new Error('La barre transparente nécessite le package LCMC et la configuration de cette mise à jour.');
}
const main = path.join(root, 'android/app/src/main');
const java = path.join(main, 'java/fr/lcmc/mesheures');
const activityPath = path.join(java, 'MainActivity.java');
let activity = fs.readFileSync(activityPath, 'utf8');
if (!activity.includes('registerPlugin(LcmcSystemBarsPlugin.class)')) {
  if (!/super\.onCreate\(/.test(activity)) throw new Error('MainActivity sans onCreate : synchronise d’abord le widget LCMC.');
  activity = activity.replace(/super\.onCreate\(/, 'registerPlugin(LcmcSystemBarsPlugin.class);\n        super.onCreate(');
}
const source = String.raw`package fr.lcmc.mesheures;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LcmcSystemBars")
public class LcmcSystemBarsPlugin extends Plugin {
    private double topInset = -1;
    private boolean lightIcons = true;

    @Override public void load() {
        getActivity().runOnUiThread(() -> {
            View webView = getBridge().getWebView();
            ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
                applyInsets(view, insets);
                return insets;
            });
            refreshWindow(webView);
        });
    }

    private void refreshWindow(View webView) {
        configureWindow();
        ViewCompat.requestApplyInsets(webView);
        // Rejouer après la pose du thème de lancement et l'attachement de la WebView.
        webView.post(() -> {
            configureWindow();
            ViewCompat.requestApplyInsets(webView);
        });
    }

    @SuppressWarnings("deprecation")
    private void configureWindow() {
        Window window = getActivity().getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.WHITE);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attributes);
        }
        if (Build.VERSION.SDK_INT >= 29) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        // Transparence et visibilité sont distinctes : ne jamais passer en plein écran immersif.
        controller.show(WindowInsetsCompat.Type.statusBars());
        controller.setAppearanceLightStatusBars(!lightIcons);
        controller.setAppearanceLightNavigationBars(true);
    }

    private JSObject snapshot() {
        JSObject result = new JSObject();
        result.put("top", topInset >= 0 ? topInset : fallbackTop());
        return result;
    }

    private double fallbackTop() {
        int resource = getContext().getResources().getIdentifier("status_bar_height", "dimen", "android");
        return resource > 0 ? getContext().getResources().getDimensionPixelSize(resource)
                / (double) getContext().getResources().getDisplayMetrics().density : 24;
    }

    private void applyInsets(View view, WindowInsetsCompat insets) {
        // Seul le haut reste derrière le contenu : navigation et clavier gardent leurs marges natives.
        Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
        int bottom = Math.max(bars.bottom, keyboard.bottom);
        ViewGroup.LayoutParams raw = view.getLayoutParams();
        if (raw instanceof ViewGroup.MarginLayoutParams) {
            ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) raw;
            if (margins.leftMargin != bars.left || margins.topMargin != 0
                    || margins.rightMargin != bars.right || margins.bottomMargin != bottom) {
                margins.setMargins(bars.left, 0, bars.right, bottom);
                view.setLayoutParams(margins);
            }
        }
        double top = bars.top / (double) view.getResources().getDisplayMetrics().density;
        if (top != topInset) {
            topInset = top;
            notifyListeners("insetsChanged", snapshot(), true);
        }
    }

    @PluginMethod public void getInsets(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            configureWindow();
            View view = getBridge().getWebView();
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(view);
            if (insets != null) applyInsets(view, insets);
            call.resolve(snapshot());
        });
    }

    @PluginMethod public void setStyle(PluginCall call) {
        boolean requested = call.getBoolean("lightIcons", true);
        getActivity().runOnUiThread(() -> {
            lightIcons = requested;
            Window window = getActivity().getWindow();
            WindowCompat.getInsetsController(window, window.getDecorView()).setAppearanceLightStatusBars(!lightIcons);
            call.resolve();
        });
    }

    @Override protected void handleOnResume() {
        getActivity().runOnUiThread(() -> refreshWindow(getBridge().getWebView()));
    }
}
`;
fs.writeFileSync(path.join(java, 'LcmcSystemBarsPlugin.java'), source);
fs.writeFileSync(activityPath, activity);
console.log('Barre d’état LCMC : photo sous les icônes, marges de navigation et clavier conservées.');
