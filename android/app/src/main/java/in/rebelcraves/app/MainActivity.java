package in.rebelcraves.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.ImageView;
import android.widget.LinearLayout;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Custom Loading Screen Logic
        ImageView logoImage = findViewById(R.id.logoImage);
        ImageView ringLoader = findViewById(R.id.ringLoader);

        if (logoImage != null) {
            Animation pulseAnim = AnimationUtils.loadAnimation(this, R.anim.logo_pulse);
            logoImage.startAnimation(pulseAnim);
        }

        if (ringLoader != null) {
            Animation rotateAnim = AnimationUtils.loadAnimation(this, R.anim.ring_rotate);
            ringLoader.startAnimation(rotateAnim);
        }
        
        // Ensure the bridge uses a client that handles tel: and whatsapp: without breaking Capacitor
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String url = uri.toString();

                    if (url.startsWith("tel:") || url.startsWith("whatsapp:")) {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        view.getContext().startActivity(intent);
                        return true;
                    }
                    
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    LinearLayout loadingLayout = findViewById(R.id.loadingLayout);
                    if (loadingLayout != null) {
                        loadingLayout.setVisibility(View.GONE);
                    }
                }
            });
        }
    }
}
