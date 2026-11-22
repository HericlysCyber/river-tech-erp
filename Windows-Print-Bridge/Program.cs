using System.Net;
using System.Text;
using System.Text.Json;
using System.Runtime.InteropServices;

// Serviço local inicial do River Tech para testes de comunicação com impressoras Windows.
// Escuta somente em loopback; não expõe a impressora à rede local/internet.
const string Prefix = "http://127.0.0.1:17654/";
using var listener = new HttpListener();
listener.Prefixes.Add(Prefix);
listener.Start();
Console.WriteLine("River Tech Print Bridge ativo em " + Prefix);
Console.WriteLine("Mantenha esta janela aberta durante os testes. Ctrl+C encerra.");

while (true)
{
    HttpListenerContext ctx;
    try { ctx = await listener.GetContextAsync(); }
    catch (HttpListenerException) { break; }

    _ = Task.Run(async () => await Handle(ctx));
}

static async Task Handle(HttpListenerContext ctx)
{
    var req = ctx.Request;
    var res = ctx.Response;
    res.Headers["Access-Control-Allow-Origin"] = req.Headers["Origin"] ?? "null";
    res.Headers["Vary"] = "Origin";
    res.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    res.Headers["Access-Control-Allow-Headers"] = "Content-Type";
    res.Headers["Access-Control-Max-Age"] = "600";

    try
    {
        if (req.HttpMethod == "OPTIONS") { res.StatusCode = 204; res.Close(); return; }
        if (req.Url?.AbsolutePath == "/health" && req.HttpMethod == "GET")
        {
            await Json(res, 200, new { ok = true, service = "RiverTech.PrintBridge", version = "0.1.0" });
            return;
        }
        if (req.Url?.AbsolutePath == "/printers" && req.HttpMethod == "GET")
        {
            var printers = System.Drawing.Printing.PrinterSettings.InstalledPrinters.Cast<string>().ToArray();
            await Json(res, 200, new { ok = true, printers });
            return;
        }
        if (req.Url?.AbsolutePath == "/print/raw" && req.HttpMethod == "POST")
        {
            using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
            var body = await reader.ReadToEndAsync();
            var payload = JsonSerializer.Deserialize<RawPrintRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (payload is null || string.IsNullOrWhiteSpace(payload.PrinterName) || string.IsNullOrWhiteSpace(payload.DataBase64))
            {
                await Json(res, 400, new { ok = false, error = "Informe printerName e dataBase64." }); return;
            }
            byte[] bytes;
            try { bytes = Convert.FromBase64String(payload.DataBase64); }
            catch { await Json(res, 400, new { ok = false, error = "dataBase64 inválido." }); return; }
            if (bytes.Length == 0 || bytes.Length > 2_000_000)
            {
                await Json(res, 400, new { ok = false, error = "Arquivo vazio ou maior que 2 MB." }); return;
            }
            RawPrinter.Send(payload.PrinterName, bytes);
            await Json(res, 200, new { ok = true, bytes = bytes.Length, printer = payload.PrinterName });
            return;
        }
        await Json(res, 404, new { ok = false, error = "Rota não encontrada." });
    }
    catch (Exception ex)
    {
        await Json(res, 500, new { ok = false, error = ex.Message });
    }
}

static async Task Json(HttpListenerResponse response, int status, object value)
{
    response.StatusCode = status;
    response.ContentType = "application/json; charset=utf-8";
    var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value));
    response.ContentLength64 = bytes.Length;
    await response.OutputStream.WriteAsync(bytes);
    response.Close();
}

record RawPrintRequest(string PrinterName, string DataBase64);

static class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private class DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName = "River Tech PDV";
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile = "";
        [MarshalAs(UnmanagedType.LPWStr)] public string pDatatype = "RAW";
    }
    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)] private static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool ClosePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)] private static extern int StartDocPrinter(IntPtr handle, int level, [In] DOC_INFO_1 info);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool EndDocPrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool StartPagePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool EndPagePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool WritePrinter(IntPtr handle, byte[] data, int count, out int written);

   public static void Send(string printerName, byte[] data)
{
    if (!OpenPrinter(printerName, out var h, IntPtr.Zero))
        throw new System.ComponentModel.Win32Exception(
            Marshal.GetLastWin32Error(),
            "Não foi possível abrir a impressora."
        );

    try
    {
        if (StartDocPrinter(h, 1, new DOC_INFO_1()) == 0)
            throw new System.ComponentModel.Win32Exception(
                Marshal.GetLastWin32Error(),
                "Não foi possível iniciar o documento."
            );

        try
        {
            if (!StartPagePrinter(h))
                throw new System.ComponentModel.Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "Não foi possível iniciar a página."
                );

            try
            {
                if (!WritePrinter(h, data, data.Length, out var written) ||
                    written != data.Length)
                {
                    throw new System.ComponentModel.Win32Exception(
                        Marshal.GetLastWin32Error(),
                        "Não foi possível enviar todos os dados à impressora."
                    );
                }
            }
            finally
            {
                EndPagePrinter(h);
            }
        }
        finally
        {
            EndDocPrinter(h);
        }
    }
    finally
    {
        ClosePrinter(h);
    }
}
}