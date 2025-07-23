import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('acorgdb-table-editor.editAsTiterTable', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const panel = vscode.window.createWebviewPanel(
                'titerTableEditor',
                'Titer Table Editor',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getWebviewContent();

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

            panel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
            });

            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'updateData':
                        isUpdatingFromWebview = true;
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(message.data, null, 4));
                        vscode.workspace.applyEdit(edit).then(() => {
                            isUpdatingFromWebview = false;
                        });
                        return;
                }
            }, undefined, context.subscriptions);
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Titer Table Editor</title>
        <style>
            body {
                font-family: sans-serif;
            }
            .container {
                padding: 20px;
                height: 100vh;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            #tableContainer {
                flex-grow: 1;
                overflow: auto;
            }
            table {
                border-collapse: collapse;
                width: 100%;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
                position: sticky;
                top: 0;
            }
            tbody th {
                position: sticky;
                left: 0;
            }
            .dropdowns {
                margin-bottom: 20px;
            }
            .dropdowns div {
                margin-bottom: 10px;
            }
            input {
                width: 100%;
                box-sizing: border-box;
            }
            .changed {
                background-color: #f0f0f0; /* Light Grey */
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Titer Table Editor</h1>
            <div class="dropdowns">
                <div>
                    <label for="resultSet">Result Set:</label>
                    <select id="resultSet"></select>
                </div>
                <div>
                    <label for="titerTable">Titer Table:</label>
                    <select id="titerTable"></select>
                </div>
            </div>
            <div id="tableContainer"></div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let fullData;
            let originalData;

            const resultSetDropdown = document.getElementById('resultSet');
            const titerTableDropdown = document.getElementById('titerTable');
            const tableContainer = document.getElementById('tableContainer');

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'loadData':
                        const selectedResultSet = resultSetDropdown.value;
                        const selectedTiterTable = titerTableDropdown.value;

                        fullData = message.data;
                        if (!originalData) {
                            originalData = JSON.parse(JSON.stringify(message.data));
                        }
                        
                        populateResultSetDropdown(fullData);

                        if (selectedResultSet) {
                            resultSetDropdown.value = selectedResultSet;
                        }
                        if (selectedTiterTable) {
                            populateTiterTableDropdown();
                            titerTableDropdown.value = selectedTiterTable;
                        }
                        
                        renderTable();
                        break;
                }
            });

            window.addEventListener('keydown', e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    originalData = JSON.parse(JSON.stringify(fullData));
                    vscode.postMessage({
                        command: 'updateData',
                        data: fullData
                    });
                }
            });

            function populateResultSetDropdown(data) {
                resultSetDropdown.innerHTML = '';
                data.forEach((resultSet, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = resultSet.id + ' | ' + resultSet.name;
                    resultSetDropdown.appendChild(option);
                });
                populateTiterTableDropdown();
            }

            function populateTiterTableDropdown() {
                const selectedResultSetIndex = resultSetDropdown.value;
                const selectedResultSet = fullData[selectedResultSetIndex];
                titerTableDropdown.innerHTML = '';
                selectedResultSet.results.forEach((table, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = table.date + ' - ' + table.file;
                    titerTableDropdown.appendChild(option);
                });
                renderTable();
            }

            function renderTable() {
                const selectedResultSetIndex = resultSetDropdown.value;
                const selectedTiterTableIndex = titerTableDropdown.value;
                if (!fullData) return;
                const tableData = fullData[selectedResultSetIndex].results[selectedTiterTableIndex];
                const originalTableData = originalData[selectedResultSetIndex].results[selectedTiterTableIndex];

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const tbody = document.createElement('tbody');

                // Header row
                const headerRow = document.createElement('tr');
                const th = document.createElement('th');
                th.textContent = 'Serum ID';
                headerRow.appendChild(th);
                tableData.antigen_ids.forEach(antigenId => {
                    const th = document.createElement('th');
                    th.textContent = antigenId;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);

                // Data rows
                tableData.serum_ids.forEach((serumId, rowIndex) => {
                    const row = document.createElement('tr');
                    const th = document.createElement('th');
                    th.textContent = serumId;
                    row.appendChild(th);
                    tableData.antigen_ids.forEach((_, colIndex) => {
                        const cell = document.createElement('td');
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.dataset.rowIndex = rowIndex;
                        input.dataset.colIndex = colIndex;
                        
                        const currentValue = tableData.titers[colIndex][rowIndex];
                        const originalValue = originalTableData.titers[colIndex][rowIndex];
                        input.value = currentValue;

                        if (currentValue !== originalValue) {
                            input.classList.add('changed');
                        }

                        input.addEventListener('change', (e) => {
                            const newValue = e.target.value;
                            fullData[selectedResultSetIndex].results[selectedTiterTableIndex].titers[colIndex][rowIndex] = newValue;
                            vscode.postMessage({
                                command: 'updateData',
                                data: fullData
                            });
                        });

                        input.addEventListener('keydown', handleArrowKeys);

                        cell.appendChild(input);
                        row.appendChild(cell);
                    });
                    tbody.appendChild(row);
                });

                table.appendChild(thead);
                table.appendChild(tbody);

                tableContainer.innerHTML = '';
                tableContainer.appendChild(table);
            }

            function handleArrowKeys(e) {
                const { key, target } = e;
                const { rowIndex, colIndex } = target.dataset;
                let nextRow = parseInt(rowIndex, 10);
                let nextCol = parseInt(colIndex, 10);

                switch (key) {
                    case 'ArrowUp':
                        nextRow--;
                        break;
                    case 'ArrowDown':
                        nextRow++;
                        break;
                    case 'ArrowLeft':
                        nextCol--;
                        break;
                    case 'ArrowRight':
                        nextCol++;
                        break;
                    default:
                        return;
                }

                const nextInput = document.querySelector('input[data-row-index="' + nextRow + '"][data-col-index="' + nextCol + '"]');
                if (nextInput) {
                    nextInput.focus();
                }
            }

            resultSetDropdown.addEventListener('change', populateTiterTableDropdown);
            titerTableDropdown.addEventListener('change', renderTable);

        </script>
    </body>
    </html>`;
}

export function deactivate() {}

