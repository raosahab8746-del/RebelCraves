package in.rebelcraves.app;

import android.os.Bundle;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ImageView logoImage = findViewById(getResources().getIdentifier("logoImage", "id", getPackageName()));
        ImageView ringLoader = findViewById(getResources().getIdentifier("ringLoader", "id", getPackageName()));

        if (logoImage != null) {
            Animation pulseAnim = AnimationUtils.loadAnimation(this, getResources().getIdentifier("logo_pulse", "anim", getPackageName()));
            logoImage.startAnimation(pulseAnim);
        }

        if (ringLoader != null) {
            Animation rotateAnim = AnimationUtils.loadAnimation(this, getResources().getIdentifier("ring_rotate", "anim", getPackageName()));
            ringLoader.startAnimation(rotateAnim);
        }

        getBridge().getWebView().setWebViewClient(new android.webkit.WebViewClient() {
            @Override
            public void onPageFinished(android.webkit.WebView view, String url) {
                View loadingLayout = findViewById(getResources().getIdentifier("loadingLayout", "id", getPackageName()));
                if (loadingLayout != null) {
                    loadingLayout.setVisibility(View.GONE);
                }
            }
        });
    }
}