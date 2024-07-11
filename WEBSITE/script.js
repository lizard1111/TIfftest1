let globalData = [];
let columns = ['acronym', 'depth', 'st_level'];
let table, thead, tbody;
let depthFilters = new Set();
let stLevelFilters = new Set();
let colorMap = {};

// Load the color CSV and populate colorMap
fetch('/Users/superfrog/PycharmProjects/TIfftest/WEBSITE/acronym_path_svg_hex_query.csv')
    .then(response => response.text())
    .then(text => {
        Papa.parse(text, {
            header: true,
            complete: function(results) {
                results.data.forEach(row => {
                    if (row.acronym && row.color_hex_triplet) {
                        const color = row.color_hex_triplet.trim().replace(/^#/, '');
                        colorMap[row.acronym] = color;
                        console.log(`Mapping color for ${row.acronym}: #${color}`);
                    }
                });
            },
            error: function(error) {
                console.error('Error parsing color CSV:', error.message);
            }
        });
    })
    .catch(error => console.error('Error loading color CSV:', error));

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;
    showLoading(true);

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        Papa.parse(file, {
            complete: function(results) {
                processData(results.data, file.name);
                if (i === files.length - 1) showLoading(false);
            },
            header: true,
            error: function(error) {
                alert("Error parsing CSV: " + error.message);
                showLoading(false);
            }
        });
    }
}

function processData(data, fileName) {
    columns.push(fileName);

    data.forEach(row => {
        if (row.acronym && row.count_sum && row.depth && row.st_level) {
            let existingRow = globalData.find(item => item.acronym === row.acronym);
            let color = colorMap[row.acronym] || '000000'; // Use color from color CSV or default to black
            if (existingRow) {
                existingRow[fileName] = parseFloat(row.count_sum);
            } else {
                let newRow = {
                    acronym: row.acronym,
                    depth: row.depth,
                    st_level: row.st_level,
                    color: color,
                    [fileName]: parseFloat(row.count_sum)
                };
                globalData.push(newRow);
            }
            depthFilters.add(row.depth);
            stLevelFilters.add(row.st_level);
        }
    });

    updateFilters();
    updateTable();
}

function updateFilters() {
    updateFilterButtons('depth_filters', depthFilters, 'depth');
    updateFilterButtons('st_level_filters', stLevelFilters, 'st_level');
}

function updateFilterButtons(containerId, filterSet, filterType) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    filterSet.forEach(value => {
        const button = document.createElement('button');
        button.textContent = value;
        button.classList.add('active');
        button.onclick = () => toggleFilter(button, containerId, value);
        container.appendChild(button);
    });
}

function toggleFilter(button, containerId, value) {
    button.classList.toggle('active');
    renderRows();
}

function updateTable() {
    if (!table) {
        table = document.createElement('table');
        thead = document.createElement('thead');
        tbody = document.createElement('tbody');
        table.appendChild(thead);
        table.appendChild(tbody);
        document.getElementById('result').appendChild(table);
    }

    // Update header
    thead.innerHTML = '';
    let headerRow = document.createElement('tr');
    columns.forEach((col, index) => {
        let th = document.createElement('th');
        th.textContent = col;
        th.onclick = () => sortTable(index);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Update body
    renderRows();
}

function renderRows() {
    const activeDepthFilters = Array.from(document.querySelectorAll('#depth_filters button.active')).map(b => b.textContent);
    const activeStLevelFilters = Array.from(document.querySelectorAll('#st_level_filters button.active')).map(b => b.textContent);

    let filteredData = globalData.filter(row =>
        activeDepthFilters.includes(row.depth) &&
        activeStLevelFilters.includes(row.st_level)
    );

    let fragment = document.createDocumentFragment();
    let minValue = Math.min(...filteredData.map(row => Math.min(...columns.slice(3).map(col => row[col] || Infinity))));
    let maxValue = Math.max(...filteredData.map(row => Math.max(...columns.slice(3).map(col => row[col] || -Infinity))));

    filteredData.forEach(row => {
        let tr = document.createElement('tr');
        columns.forEach(col => {
            let td = document.createElement('td');
            if (col === 'acronym') {
                td.textContent = row[col];
                td.style.backgroundColor = `#${row.color}`;
                td.style.color = getContrastColor(row.color);
                console.log(`Color for ${row.acronym}: #${row.color}`); // Debugging line
            } else if (col === 'depth' || col === 'st_level') {
                td.textContent = row[col];
            } else {
                let value = row[col];
                if (value !== undefined) {
                    td.textContent = value.toFixed(2);
                    td.style.color = getGradientColor(value, minValue, maxValue);
                }
            }
            tr.appendChild(td);
        });
        fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbod
