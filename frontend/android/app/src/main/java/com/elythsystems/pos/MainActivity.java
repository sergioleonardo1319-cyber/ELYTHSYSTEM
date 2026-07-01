package com.elythsystems.pos;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.os.RemoteException;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.text.Html;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import woyou.aidlservice.jiuiv5.IWoyouService;

public class MainActivity extends BridgeActivity {
    private IWoyouService sunmiPrinterService;

    private final ServiceConnection sunmiPrinterConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            sunmiPrinterService = IWoyouService.Stub.asInterface(service);
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            sunmiPrinterService = null;
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bindSunmiPrinterService();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(
                new ElythSunmiPrinterBridge(this),
                "ElythSunmiPrinter"
            );
        }
    }

    @Override
    protected void onDestroy() {
        try {
            unbindService(sunmiPrinterConnection);
        } catch (Exception ignored) {
        }

        super.onDestroy();
    }

    private void bindSunmiPrinterService() {
        Intent intent = new Intent();
        intent.setPackage("woyou.aidlservice.jiuiv5");
        intent.setAction("woyou.aidlservice.jiuiv5.IWoyouService");

        try {
            bindService(intent, sunmiPrinterConnection, Context.BIND_AUTO_CREATE);
        } catch (Exception ignored) {
            sunmiPrinterService = null;
        }
    }

    private boolean printWithSunmiService(String html) {
        if (sunmiPrinterService == null) {
            bindSunmiPrinterService();
            return false;
        }

        String text = extractSunmiText(html);

        try {
            sunmiPrinterService.printerInit(null);
            sunmiPrinterService.setAlignment(0, null);
            sunmiPrinterService.setFontSize(24f, null);
            sunmiPrinterService.printText(text + "\n", null);
            sunmiPrinterService.lineWrap(4, null);
            return true;
        } catch (RemoteException error) {
            sunmiPrinterService = null;
            return false;
        }
    }

    private String extractSunmiText(String html) {
        Pattern pattern = Pattern.compile(
            "<script[^>]*id=[\"']elyth-sunmi-text[\"'][^>]*>([\\s\\S]*?)</script>",
            Pattern.CASE_INSENSITIVE
        );
        Matcher matcher = pattern.matcher(html);

        if (matcher.find()) {
            return Html.fromHtml(matcher.group(1), Html.FROM_HTML_MODE_LEGACY).toString().trim();
        }

        return Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY).toString().trim();
    }

    public class ElythSunmiPrinterBridge {
        private final MainActivity activity;

        ElythSunmiPrinterBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void printHtml(String html) {
            activity.runOnUiThread(() -> {
                if (activity.printWithSunmiService(html)) {
                    return;
                }

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
