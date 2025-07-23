import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('acorgdb-table-editor.editAsTiterTable', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const panel = vscode.window.createWebviewPanel(
                'titerTableEditor',
                'Titer Table Editor',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getWebviewContent(panel.webview, context);

            let isUpdatingFromWebview = false;

            const updateWebview = () => {
                try {
                    const json = JSON.parse(document.getText());
                    panel.webview.postMessage({
                        command: 'loadData',
                        data: json
                    });
                } catch (e) {
                    // Do nothing, the file is likely in an intermediate state
                }
            };

            updateWebview();

            const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.uri.toString() === document.uri.toString() && !isUpdatingFromWebview) {
                    updateWebview();
                }
            });

            const saveDocumentSubscription = vscode.workspace.onDidSaveTextDocument(doc => {
                if (doc.uri.toString() === document.uri.toString()) {
                    panel.webview.postMessage({ command: 'saveComplete' });
                }
            });

            panel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
                saveDocumentSubscription.dispose();
            });

            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'updateData':
                        isUpdatingFromWebview = true;
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(message.data, null, 4) + '\n');
                        vscode.workspace.applyEdit(edit).then(() => {
                            isUpdatingFromWebview = false;
                        });
                        return;
                    case 'saveData':
                        editor.document.save();
                        return;
                }
            }, undefined, context.subscriptions);
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'editor.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'editor.css'));

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>acorgdb editor</title>
        <link rel="stylesheet" href="${styleUri}">
    </head>
    <body>
        <div class="container">
            <h1>acorgdb editor</h1>
            <div class="dropdowns">
                <div>
                    <label for="resultSet">Experiment:</label>
                    <select id="resultSet"></select>
                </div>
                <div>
                    <label for="titerTable">Table:</label>
                    <select id="titerTable"></select>
                </div>
            </div>
            <div id="tableContainer"></div>
        </div>
        <script src="${scriptUri}"></script>
    </body>
    </html>`;
}

export function deactivate() {}