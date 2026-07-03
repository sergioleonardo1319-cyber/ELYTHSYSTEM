package com.elythsystems.pos;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.RemoteException;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.text.Html;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import woyou.aidlservice.jiuiv5.IWoyouService;

public class MainActivity extends BridgeActivity {
    private IWoyouService sunmiPrinterService;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String lastPrinterEvent = "Sin intentos";
    private String lastPrinterError = "";
    private String lastPrintMode = "";
    private String lastPrintAt = "";
    private boolean sunmiBridgeRegistered = false;

    private final ServiceConnection sunmiPrinterConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            sunmiPrinterService = IWoyouService.Stub.asInterface(service);
            setPrinterEvent("Servicio Sunmi conectado", "sunmi", "");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            sunmiPrinterService = null;
            setPrinterEvent("Servicio Sunmi desconectado", "sunmi", "Servicio desconectado");
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bindSunmiPrinterService();
        registerSunmiJavascriptBridge(0);
    }

    @Override
    protected void onResume() {
        super.onResume();
        bindSunmiPrinterService();
        registerSunmiJavascriptBridge(0);
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
            setPrinterEvent("No fue posible enlazar Sunmi", "sunmi", ignored.getMessage());
        }
    }

    private void registerSunmiJavascriptBridge(int attempt) {
        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;

        if (webView == null) {
            if (attempt < 12) {
                mainHandler.postDelayed(
                    () -> registerSunmiJavascriptBridge(attempt + 1),
                    300
                );
            } else {
                setPrinterEvent(
                    "WebView no disponible para registrar puente",
                    "bridge",
                    "No se pudo registrar ElythSunmiPrinter"
                );
            }
            return;
        }

        webView.post(() -> {
            try {
                webView.removeJavascriptInterface("ElythSunmiPrinter");
            } catch (Exception ignored) {
            }

            webView.addJavascriptInterface(
                new ElythSunmiPrinterBridge(this),
                "ElythSunmiPrinter"
            );
            sunmiBridgeRegistered = true;
            setPrinterEvent("Puente JS Sunmi registrado", "bridge", "");
        });
    }

    private boolean printWithSunmiService(String html) {
        String text = extractSunmiText(html);
        return printTextWithSunmiService(text);
    }

    private boolean printTextWithSunmiService(String text) {
        if (sunmiPrinterService == null) {
            bindSunmiPrinterService();
            setPrinterEvent("Servicio Sunmi no disponible", "sunmi", "Servicio nativo no conectado");
            return false;
        }

        String safeText = text == null ? "" : text;

        try {
            sunmiPrinterService.printerInit(null);
            sunmiPrinterService.setAlignment(0, null);
            sunmiPrinterService.setFontSize(24f, null);
            sunmiPrinterService.printText(safeText + "\n", null);
            sunmiPrinterService.lineWrap(4, null);
            setPrinterEvent("Impresion enviada por Sunmi", "sunmi", "");
            return true;
        } catch (RemoteException error) {
            sunmiPrinterService = null;
            setPrinterEvent("Error imprimiendo por Sunmi", "sunmi", error.getMessage());
            return false;
        }
    }

    private void printHtmlPreferSunmi(String html) {
        if (printWithSunmiService(html)) {
            return;
        }

        bindSunmiPrinterService();

        mainHandler.postDelayed(() -> {
            if (printWithSunmiService(html)) {
                return;
            }

            Toast.makeText(
                this,
                "Impresora Sunmi no disponible. Intentando impresion Android.",
                Toast.LENGTH_SHORT
            ).show();
            printWithAndroidSystem(html);
        }, 1200);
    }

    private void printWithAndroidSystem(String html) {
        setPrinterEvent("Intentando impresion Android", "android-print-manager", "");

        WebView printWebView = new WebView(this);
        printWebView.getSettings().setJavaScriptEnabled(false);
        printWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                PrintManager printManager =
                    (PrintManager) getSystemService(Context.PRINT_SERVICE);

                if (printManager == null) {
                    setPrinterEvent(
                        "Android PrintManager no disponible",
                        "android-print-manager",
                        "No fue posible abrir impresion Android"
                    );
                    Toast.makeText(
                        MainActivity.this,
                        "No fue posible abrir impresion Android.",
                        Toast.LENGTH_SHORT
                    ).show();
                    view.destroy();
                    return;
                }

                PrintDocumentAdapter adapter =
                    view.createPrintDocumentAdapter("ELYTH POS");

                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();

                setPrinterEvent("Dialogo Android enviado", "android-print-manager", "");
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

    private void setPrinterEvent(String event, String mode, String error) {
        lastPrinterEvent = event == null ? "" : event;
        lastPrintMode = mode == null ? "" : mode;
        lastPrinterError = error == null ? "" : error;
        lastPrintAt = String.valueOf(System.currentTimeMillis());
    }

    private String jsonEscape(String value) {
        if (value == null) return "";

        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "");
    }

    private String getPrinterStatusJson() {
        return "{"
            + "\"ok\":true,"
            + "\"bridge\":\"ElythSunmiPrinter\","
            + "\"device\":\"Android/Sunmi\","
            + "\"bridge_registered\":" + sunmiBridgeRegistered + ","
            + "\"service_connected\":" + (sunmiPrinterService != null) + ","
            + "\"last_event\":\"" + jsonEscape(lastPrinterEvent) + "\","
            + "\"last_error\":\"" + jsonEscape(lastPrinterError) + "\","
            + "\"last_mode\":\"" + jsonEscape(lastPrintMode) + "\","
            + "\"last_at\":\"" + jsonEscape(lastPrintAt) + "\""
            + "}";
    }

    public class ElythSunmiPrinterBridge {
        private final MainActivity activity;

        ElythSunmiPrinterBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void printHtml(String html) {
            activity.runOnUiThread(() -> activity.printHtmlPreferSunmi(html));
        }

        @JavascriptInterface
        public void print(String html) {
            printHtml(html);
        }

        @JavascriptInterface
        public String getStatus() {
            return activity.getPrinterStatusJson();
        }

        @JavascriptInterface
        public String testPrint(String text) {
            String safeText = text == null || text.trim().isEmpty()
                ? "ELYTH POS\nPRUEBA DE IMPRESION\nSunmi"
                : text;

            activity.printTextWithSunmiService(safeText);
            return activity.getPrinterStatusJson();
        }
    }
}
