package com.elythsystems.pos;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.text.Html;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import woyou.aidlservice.jiuiv5.IWoyouService;

@CapacitorPlugin(name = "ElythSunmiPrinter")
public class ElythSunmiPrinterPlugin extends Plugin {
    private IWoyouService sunmiPrinterService;
    private String lastPrinterEvent = "Plugin cargado";
    private String lastPrinterError = "";
    private String lastPrintMode = "capacitor-plugin";
    private String lastPrintAt = "";

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
    public void load() {
        bindSunmiPrinterService();
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unbindService(sunmiPrinterConnection);
        } catch (Exception ignored) {
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void testPrint(PluginCall call) {
        String text = call.getString("text", "ELYTH POS\nPRUEBA DE IMPRESION\nSunmi");
        boolean ok = printTextWithSunmiService(text);
        JSObject result = buildStatus();
        result.put("test_ok", ok);
        call.resolve(result);
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html", "");
        boolean ok = printTextWithSunmiService(extractSunmiText(html));
        JSObject result = buildStatus();
        result.put("print_ok", ok);
        call.resolve(result);
    }

    @PluginMethod
    public void print(PluginCall call) {
        String text = call.getString("text", call.getString("html", ""));
        boolean ok = printTextWithSunmiService(text);
        JSObject result = buildStatus();
        result.put("print_ok", ok);
        call.resolve(result);
    }

    private void bindSunmiPrinterService() {
        Intent intent = new Intent();
        intent.setPackage("woyou.aidlservice.jiuiv5");
        intent.setAction("woyou.aidlservice.jiuiv5.IWoyouService");

        try {
            getContext().bindService(intent, sunmiPrinterConnection, Context.BIND_AUTO_CREATE);
        } catch (Exception error) {
            sunmiPrinterService = null;
            setPrinterEvent("No fue posible enlazar Sunmi", "sunmi", error.getMessage());
        }
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
            setPrinterEvent("Impresion enviada por plugin Capacitor", "sunmi", "");
            return true;
        } catch (RemoteException error) {
            sunmiPrinterService = null;
            setPrinterEvent("Error imprimiendo por Sunmi", "sunmi", error.getMessage());
            return false;
        }
    }

    private String extractSunmiText(String html) {
        Pattern pattern = Pattern.compile(
            "<script[^>]*id=[\"']elyth-sunmi-text[\"'][^>]*>([\\s\\S]*?)</script>",
            Pattern.CASE_INSENSITIVE
        );
        Matcher matcher = pattern.matcher(html == null ? "" : html);

        if (matcher.find()) {
            return Html.fromHtml(matcher.group(1), Html.FROM_HTML_MODE_LEGACY).toString().trim();
        }

        return Html.fromHtml(html == null ? "" : html, Html.FROM_HTML_MODE_LEGACY).toString().trim();
    }

    private void setPrinterEvent(String event, String mode, String error) {
        lastPrinterEvent = event == null ? "" : event;
        lastPrintMode = mode == null ? "" : mode;
        lastPrinterError = error == null ? "" : error;
        lastPrintAt = String.valueOf(System.currentTimeMillis());
    }

    private JSObject buildStatus() {
        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("bridge", "ElythSunmiPrinter");
        result.put("bridge_registered", true);
        result.put("device", "Android/Sunmi");
        result.put("source", "capacitor-plugin");
        result.put("service_connected", sunmiPrinterService != null);
        result.put("last_event", lastPrinterEvent);
        result.put("last_error", lastPrinterError);
        result.put("last_mode", lastPrintMode);
        result.put("last_at", lastPrintAt);
        return result;
    }
}
