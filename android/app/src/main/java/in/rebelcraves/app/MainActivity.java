package in.rebelcraves.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ImageView logoImage = findViewById(getResources().getIdentifier("logoImage", "id", getPackageName()));
        ImageView ringLoader = findViewById(getResources().getIdentifier("ringLoader", "id", getPackageName()));

        if (logoImage != null) {
            Animation pulseAnim = AnimationUtils.loadAnimation(this, R.anim.logo_pulse);
            logoImage.startAnimation(pulseAnim);
        }

        if (ringLoader != null) {
            Animation rotateAnim = AnimationUtils.loadAnimation(this, R.anim.ring_rotate);
            ringLoader.startAnimation(rotateAnim);
        }

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String url = uri.toString();

                    if (url.startsWith("tel:") || url.startsWith("whatsapp:")) {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    }
                    return false;
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    View loadingLayout = findViewById(getResources().getIdentifier("loadingLayout", "id", getPackageName()));
                    if (loadingLayout != null) {
                        loadingLayout.setVisibility(View.GONE);
                    }
                }
            });
        }
    }
}
