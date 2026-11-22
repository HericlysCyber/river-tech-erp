# River Tech Print Bridge (Windows) — versão inicial 0.1.0

Componente auxiliar local para preparar a impressão RAW/ESC-POS em impressoras instaladas no Windows. Ele não altera as rotinas de venda nem substitui o driver do fabricante.

## Requisitos
- Windows 10 ou 11, 64 bits.
- .NET 8 SDK para compilar (na fase de desenvolvimento).
- Impressora instalada no Windows com driver do fabricante.
- Para impressão térmica RAW/ESC-POS, impressora e driver devem aceitar dados RAW.

## Compilar e executar para teste
Abra PowerShell nesta pasta:

```powershell
dotnet build -c Release
dotnet run -c Release
```

A janela deve informar `http://127.0.0.1:17654/`. Mantenha-a aberta.

## Endpoints
- `GET http://127.0.0.1:17654/health` — verifica se o serviço está ativo.
- `GET http://127.0.0.1:17654/printers` — lista impressoras instaladas no Windows.
- `POST http://127.0.0.1:17654/print/raw` — envia bytes RAW para uma impressora.

Exemplo de corpo JSON para `POST /print/raw`:

```json
{
  "printerName": "NOME EXATO DA IMPRESSORA NO WINDOWS",
  "dataBase64": "G0Ah"
}
```

`dataBase64` deve conter os bytes do trabalho de impressão codificados em Base64. O limite atual é 2 MB.

## Segurança e limites desta versão
- O serviço escuta apenas em `127.0.0.1`, não na rede.
- Ainda não deve ser instalado como serviço permanente nem iniciado automaticamente.
- A integração direta com a tela do PDV, seleção de impressora, montagem dos comandos ESC/POS, corte e gaveta de dinheiro ainda precisa ser implementada e validada com o modelo físico.
- A compatibilidade do navegador HTTPS com chamadas ao serviço local precisa ser testada no computador de destino.
- O endpoint RAW não autentica chamadas locais; use apenas durante testes no computador confiável do operador. Antes de distribuição comercial, adicionar token local, validação estrita de origem, instalador assinado e política de atualização.

## Padrões previstos para o PDV
- Térmica: bobina nominal de 80 mm como padrão, com perfil alternativo de 58 mm.
- Convencional: página A4 via impressão do Windows.
- Etiquetas: dimensões configuráveis conforme o modelo/rolo instalado.

A largura útil e a densidade de impressão variam por equipamento. Validar margem e corte no modelo real antes de liberar para clientes.
