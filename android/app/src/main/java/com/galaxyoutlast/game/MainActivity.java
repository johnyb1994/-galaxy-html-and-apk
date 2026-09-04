package com.galaxyoutlast.game;

import android.os.Bundle;
import android.os.Process;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.PixelFormat;
import android.graphics.Color;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.view.View;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUI();

        // 1. Window 32-bit RGBA hardware buffer format, keep screen on, and lock high-performance display mode
        try {
            Window window = getWindow();
            window.setFormat(PixelFormat.RGBA_8888);
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            window.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.view.Display display = getDisplay();
                if (display != null) {
                    android.view.Display.Mode[] modes = display.getSupportedModes();
                    android.view.Display.Mode maxMode = null;
                    float maxRate = 0;
                    for (android.view.Display.Mode mode : modes) {
                        if (mode.getRefreshRate() > maxRate) {
                            maxRate = mode.getRefreshRate();
                            maxMode = mode;
                        }
                    }
                    if (maxMode != null) {
                        WindowManager.LayoutParams params = window.getAttributes();
                        params.preferredDisplayModeId = maxMode.getModeId();
                        window.setAttributes(params);
                    }
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                WindowManager.LayoutParams params = window.getAttributes();
                params.preferredRefreshRate = 0.0f;
                window.setAttributes(params);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                window.setSustainedPerformanceMode(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            // Use LAYER_TYPE_NONE so Chromium renders directly to the Window surface
            // without creating an offscreen GPU FBO layer (matches Google Chrome Mobile performance).
            webView.setLayerType(View.LAYER_TYPE_NONE, null);
            webView.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
            
            // 2. Opaque Black background to skip SurfaceFlinger alpha blending
            webView.setBackgroundColor(Color.BLACK);

            // 3. Disable Android UI overscroll & scrollbar composite passes
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().evaluateJavascript("window._onAppMinimize && window._onAppMinimize();", null);
            this.bridge.getWebView().onPause();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().onResume();
            this.bridge.getWebView().evaluateJavascript("window._onAppResume && window._onAppResume();", null);
        }
    }

    @Override
    public void onStop() {
        super.onStop();
    }

    @Override
    public void onDestroy() {
        try {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Exception e) {
            e.printStackTrace();
        }
        super.onDestroy();
    }

    private void hideSystemUI() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
