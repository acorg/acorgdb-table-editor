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
        case 'saveComplete':
            originalData = JSON.parse(JSON.stringify(fullData));
            renderTable();
            break;
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
    if (!fullData || !originalData) return;
    const tableData = fullData[selectedResultSetIndex].results[selectedTiterTableIndex];
    const originalTableData = originalData[selectedResultSetIndex].results[selectedTiterTableIndex];

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Header row
    const headerRow = document.createElement('tr');
    const th = document.createElement('th');
    headerRow.appendChild(th);
    tableData.serum_ids.forEach(serumId => {
        const th = document.createElement('th');
        th.textContent = serumId;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Data rows
    tableData.antigen_ids.forEach((antigenId, rowIndex) => {
        const row = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = antigenId;
        row.appendChild(th);
        tableData.serum_ids.forEach((_, colIndex) => {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.rowIndex = rowIndex;
            input.dataset.colIndex = colIndex;

            const currentValue = tableData.titers[rowIndex][colIndex];
            const originalValue = originalTableData.titers[rowIndex][colIndex];
            input.value = currentValue;

            if (currentValue !== originalValue) {
                input.classList.add('changed');
            }

            input.addEventListener('change', (e) => {
                const newValue = e.target.value;
                fullData[selectedResultSetIndex].results[selectedTiterTableIndex].titers[rowIndex][colIndex] = newValue;

                if (newValue !== originalValue) {
                    e.target.classList.add('changed');
                } else {
                    e.target.classList.remove('changed');
                }

                vscode.postMessage({
                    command: 'updateData',
                    data: fullData
                });
            });

            input.addEventListener('keydown', handleArrowKeys);

            input.addEventListener('focus', (e) => {
                const { rowIndex, colIndex } = e.target.dataset;
                highlightRowAndColumn(rowIndex, colIndex, true);
            });

            input.addEventListener('blur', (e) => {
                const { rowIndex, colIndex } = e.target.dataset;
                highlightRowAndColumn(rowIndex, colIndex, false);
            });

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

function highlightRowAndColumn(rowIndex, colIndex, highlight) {
    const table = tableContainer.querySelector('table');
    if (!table) return;

    // Highlight row
    const row = table.rows[parseInt(rowIndex, 10) + 1]; // +1 to account for header row
    if (row) {
        if (highlight) {
            row.classList.add('highlight-row');
        } else {
            row.classList.remove('highlight-row');
        }
    }

    // Highlight column, skipping the header row
    for (let i = 1; i < table.rows.length; i++) {
        const cell = table.rows[i].cells[parseInt(colIndex, 10) + 1]; // +1 to account for row header
        if (cell) {
            if (highlight) {
                cell.classList.add('highlight-col');
            } else {
                cell.classList.remove('highlight-col');
            }
        }
    }
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

window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        vscode.postMessage({
            command: 'saveData'
        });
    }
});