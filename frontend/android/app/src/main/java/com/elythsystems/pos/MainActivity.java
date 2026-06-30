package com.elythsystems.pos;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(
                new ElythSunmiPrinterBridge(this),
                "ElythSunmiPrinter"
            );
        }
    }

    public static class ElythSunmiPrinterBridge {
        private final MainActivity activity;

        ElythSunmiPrinterBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void printHtml(String html) {
            activity.runOnUiThread(() -> {
                WebView printWebView = new WebView(activity);
                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintManager printManager =
                            (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);

                        if (printManager == null) {
                            view.destroy();
                            return;
                        }

                        PrintDocumentAdapter adapter =
                            view.createPrintDocumentAdapter("ELYTH POS");

                        PrintAttributes attributes = new PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build();

                        printManager.print("ELYTH POS", adapter, attributes);
                    }
                });

                printWebView.loadDataWithBaseURL(
                    null,
                    html,
                    "text/html",
                    "UTF-8",
                    null
                );
            });
        }
    }
}
