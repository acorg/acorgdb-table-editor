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
