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

        // 1. Thread Priority Elevation to URGENT_DISPLAY
        try {
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_DISPLAY);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Window 32-bit RGBA hardware buffer format & Sustained Performance Mode
        try {
            Window window = getWindow();
            window.setFormat(PixelFormat.RGBA_8888);
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                window.setSustainedPerformanceMode(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.clearCache(true);
            webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            
            // 3. Explicit Hardware Acceleration layer on WebView
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // 4. Opaque Black background to skip SurfaceFlinger alpha blending
            webView.setBackgroundColor(Color.BLACK);

            // 5. Disable Android UI overscroll & scrollbar composite passes
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            
            // 6. High render priority and storage acceleration
            try {
                webView.getSettings().setRenderPriority(WebSettings.RenderPriority.HIGH);
            } catch (Exception e) {
                e.printStackTrace();
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    webView.getSettings().setOffscreenPreRaster(true);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
        }

        // Lock Display Refresh Rate to Highest Available (120Hz/144Hz/165Hz) to prevent 60Hz drops on touch release
        try {
            Window window = getWindow();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                android.view.Display display = getWindowManager().getDefaultDisplay();
                android.view.Display.Mode[] modes = display.getSupportedModes();
                android.view.Display.Mode maxMode = null;
                float maxRefreshRate = 0;
                for (android.view.Display.Mode mode : modes) {
                    if (mode.getRefreshRate() > maxRefreshRate) {
                        maxRefreshRate = mode.getRefreshRate();
                        maxMode = mode;
                    }
                }
                if (maxMode != null) {
                    WindowManager.LayoutParams lp = window.getAttributes();
                    lp.preferredDisplayModeId = maxMode.getModeId();
                    window.setAttributes(lp);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
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
