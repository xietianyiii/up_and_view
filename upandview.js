var map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// Define beautified default and highlight styles
const defaultStyle = {
    color: "#3388ff", // Black border color
    weight: 2,
    opacity: 1,
    dashArray: '5,5', // Dashed line
    fillColor: "#3388ff", // Dark gray fill
    fillOpacity: 0.1,
    fillPattern: 'cross' // Apply a crosshatch fill pattern
};

const highlightStyle = {
    color: "#00BFFF", // Blue fill
    weight: 0, // No border
    fillColor: "#00BFFF",
    fillOpacity: 0.5
};

// Function to reset the style of all features
function resetHighlight(layer) {
    layer.setStyle(defaultStyle);
}

// Function to highlight the selected feature
function highlightFeature(layer) {
    layer.setStyle(highlightStyle);
}

// Modify loadTableData function to include style and highlight functionality
function loadTableData(tableName) {
    fetch(`http://127.0.0.1:5000/data/${tableName}`)
        .then(response => response.json())
        .then(data => {
            // Clear any existing layers before adding a new one
            if (window.currentLayer) {
                map.removeLayer(window.currentLayer);
            }

            // Add new layer and set up click events for features
            const layer = L.geoJSON(data, {
                style: defaultStyle, // Apply default style
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        // Reset previous highlight if exists
                        if (window.highlightedLayer) {
                            resetHighlight(window.highlightedLayer);
                        }

                        // Highlight the selected layer
                        highlightFeature(layer);
                        window.highlightedLayer = layer; // Store the currently highlighted layer

                        // Fit map bounds to the selected layer
                        map.fitBounds(layer.getBounds());

                        // Show properties of the clicked feature
                        if (feature.properties) {
                            showClickedInfo(feature.properties);
                            loadFeatureAttributes(tableName, feature.properties.id);
                        } else {
                            showClickedInfo({});
                        }
                    });
                }
            }).addTo(map);

            // Store the new layer as the current layer
            window.currentLayer = layer;

            // Zoom to new layer bounds
            map.fitBounds(layer.getBounds());

            // Load all attributes for the current map
            loadAllAttributes(tableName);
        })
        .catch(error => {
            alert('Error loading data: ' + error.message);
            console.error('Error loading data:', error);
        });
}


function loadTableFields(tableNames) {
    const fieldsContainer = document.getElementById('fields-container');
    fieldsContainer.innerHTML = '';

    tableNames.forEach(tableName => {
        fetch(`http://127.0.0.1:5000/fields/${tableName}`)
            .then(response => response.json())
            .then(data => {
                const fields = data.fields;
                const rows = data.data;

                fieldsContainer.innerHTML = ''; // Clear previous fields if any

                fields.forEach(field => {
                    const fieldDiv = document.createElement('div');
                    fieldDiv.classList.add('field-item');

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = field;
                    checkbox.value = field;
                    checkbox.addEventListener('change', () => updateAttributes(rows, fields));

                    const label = document.createElement('label');
                    label.htmlFor = field;
                    label.textContent = field;

                    fieldDiv.appendChild(checkbox);
                    fieldDiv.appendChild(label);
                    fieldsContainer.appendChild(fieldDiv);
                });
            });
    });

}

function updateAttributes(rows, fields) {
    const checkboxes = document.querySelectorAll('#fields-container input[type="checkbox"]:checked');
    const selectedFields = Array.from(checkboxes).map(cb => cb.value);
    const attributesDiv = document.getElementById('attributes');
    attributesDiv.innerHTML = '';

    rows.forEach(row => {
        const selectedProps = selectedFields.reduce((acc, field) => {
            if (row[field] !== undefined) {
                acc[field] = row[field];
            }
            return acc;
        }, {});

        const propDiv = document.createElement('div');
        propDiv.textContent = JSON.stringify(selectedProps, null, 2);
        attributesDiv.appendChild(propDiv);
    });
}

function onEachFeature(feature, layer) {
    layer.on('click', function () {
        map.fitBounds(layer.getBounds());
        const properties = feature.properties;
        const infoDiv = document.getElementById('clicked-attributes');
        if (properties) {
            showClickedInfo(feature.properties);
            loadFeatureAttributes(tableName, feature.properties.id);
        } else {
            showClickedInfo({});
        }
    });
}


function generateTable(data) {
    if (data.length === 0) {
        return '<p>No data available.</p>';
    }

    var table = '<table class="display" style="width:100%"><thead><tr>';
    for (var key in data[0]) {
        if (data[0].hasOwnProperty(key)) {
            table += '<th>' + key + '</th>';
        }
    }
    table += '</tr></thead><tbody>';
    data.forEach(function (item) {
        table += '<tr>';
        for (var key in item) {
            if (item.hasOwnProperty(key)) {
                table += '<td>' + item[key] + '</td>';
            }
        }
        table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
}


function initializeDataTable(selector, isClickedAttributes) {
    $(selector).DataTable({
        dom: isClickedAttributes ? 't' : 'lfrtip',
        paging: !isClickedAttributes,
        searching: !isClickedAttributes,
        info: !isClickedAttributes
    });
}

function uploadShapefile() {
    const formData = new FormData();
    const fileInput = document.getElementById('shapefiles');

    if (fileInput.files.length === 0) {
        alert("Please select files to upload.");
        return;
    }

    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('shapefiles', fileInput.files[i]);
    }

    fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(result => {
            alert(result.join("\n"));
            loadTableList();
        })
        .catch(error => console.error('Error:', error));
}


function loadTableList() {
    fetch('http://127.0.0.1:5000/tables')
        .then(response => response.json())
        .then(tables => {
            const container = document.getElementById('ID-tree-demo');
            const tree = layui.tree;

            container.innerHTML = '';
            tree.render({
                elem: '#ID-tree-demo',
                data: tables.map(table => ({
                    title: table,
                    id: table
                })),
                showCheckbox: true,
                id: 'demo-id-1',
                isJump: true,
                click: function (obj) {
                    toggleAllAttributes();
                },
                oncheck: function (obj) {
                    const checkedData = tree.getChecked('demo-id-1');

                    // Ensure only one layer is selected at a time
                    if (checkedData.length > 1) {
                        // Uncheck the previous selections
                        checkedData.slice(0, -1).forEach(previousSelection => {
                            tree.setChecked(previousSelection.id, false, 'demo-id-1');
                        });
                    }

                    const selectedTables = tree.getChecked('demo-id-1').map(item => item.id);

                    // Clear existing layers if no tables are selected
                    if (selectedTables.length === 0) {
                        if (window.currentLayer) {
                            map.removeLayer(window.currentLayer);
                            window.currentLayer = null;
                        }
                    } else {
                        // Load data for the currently selected table
                        const tableName = selectedTables[0];
                        loadTableData(tableName);
                    }
                }
            });
        });
}


function toggleAllAttributes() {
    const card = document.getElementById('all-attributes-card');
    if (card.style.display === 'none') {
        loadAllAttributes();
        card.style.display = 'block';
    } else {
        card.style.display = 'none';
    }
}

function loadAllAttributes() {
    const tables = document.querySelectorAll('#ID-tree-demo input[type="checkbox"]:checked');
    const tableNames = Array.from(tables).map(cb => cb.value);
    const allAttributesDiv = document.getElementById('all-attributes');
    allAttributesDiv.innerHTML = '';

    tableNames.forEach(tableName => {
        fetch(`http://127.0.0.1:5000/fields/${tableName}`)
            .then(response => response.json())
            .then(data => {
                allAttributesDiv.innerHTML += generateTable(data.data);
                initializeDataTable('#all-attributes table', false);
            })
            .catch(error => console.error('Error loading all attributes:', error));
    });
}

function loadFeatureAttributes(tableName, featureId) {
    fetch(`http://127.0.0.1:5000/fields/${tableName}`)
        .then(response => response.json())
        .then(data => {
            const featureAttributes = data.data.find(item => item.gid === featureId);
            showClickedInfo(featureAttributes ? featureAttributes : {});
        })
        .catch(error => {
            alert('Error loading attributes: ' + error.message);
            console.error('Error loading attributes:', error);
        });
}

function showClickedInfo(properties) {
    var infoDiv = document.getElementById('clicked-attributes');
    if (Object.keys(properties).length === 0) {
        infoDiv.innerHTML = '<p>No properties found.</p>';
    } else {
        infoDiv.innerHTML = generateTable([properties]);
        initializeDataTable('#clicked-attributes table', true);
    }
}

document.addEventListener('DOMContentLoaded', loadTableList);

function openTransfer() {
    const leftSide = document.getElementById('left-side');
    const rightSide = document.getElementById('right-side');

    // Clear previous content on both sides
    leftSide.innerHTML = '';
    rightSide.innerHTML = '';

    // Extract column names from clicked attributes
    const table = document.querySelector('#clicked-attributes table');
    if (table) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText);
        headers.forEach(header => {
            const div = document.createElement('div');
            div.textContent = header;
            div.className = 'transfer-item';
            div.onclick = function () {
                div.classList.toggle('selected');
            };
            leftSide.appendChild(div);
        });
    }

    document.getElementById('transfer-modal').style.display = 'block';
}

function transferToRight() {
    const leftSide = document.getElementById('left-side');
    const rightSide = document.getElementById('right-side');

    Array.from(leftSide.querySelectorAll('.selected')).forEach(item => {
        item.classList.remove('selected');
        rightSide.appendChild(item);
    });

    // Automatically apply changes to the attributes
    updateSelectedAttributes();
}

function transferToLeft() {
    const leftSide = document.getElementById('left-side');
    const rightSide = document.getElementById('right-side');

    Array.from(rightSide.querySelectorAll('.selected')).forEach(item => {
        item.classList.remove('selected');
        leftSide.appendChild(item);
    });

    // Automatically apply changes to the attributes
    updateSelectedAttributes();
}

function closeTransfer() {
    document.getElementById('transfer-modal').style.display = 'none';
}

function updateSelectedAttributes() {
    const attributesDiv = document.getElementById('attributes');
    attributesDiv.innerHTML = ''; // Clear previous content

    const rightSide = document.getElementById('right-side');
    const selectedAttributes = Array.from(rightSide.children).map(item => item.textContent);

    const table = document.querySelector('#clicked-attributes table');
    if (table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const headerRow = rows[0];
        const valueRow = rows[1];

        const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.innerText);
        const values = Array.from(valueRow.querySelectorAll('td')).map(td => td.innerText);

        selectedAttributes.forEach(attribute => {
            const headerIndex = headers.indexOf(attribute);
            if (headerIndex !== -1) {
                const attributeValue = values[headerIndex];

                // Create div for the column name
                const nameDiv = document.createElement('div');
                nameDiv.className = 'attribute-name';
                nameDiv.textContent = attribute;

                // Create div for the column value
                const valueDiv = document.createElement('div');
                valueDiv.className = 'attribute-value';
                valueDiv.textContent = attributeValue;

                // Append name and value to the attributes div
                attributesDiv.appendChild(nameDiv);
                attributesDiv.appendChild(valueDiv);
            }
        });
    }
}

function exportMap() {
    // 获取需要截取的div
    const mapExportDiv = document.getElementById('map-export');
    const loadingMask = document.getElementById('loading-mask');
    const mainContainer = document.getElementById('main-container');

    // 显示遮罩层，并将页面虚化
    loadingMask.style.visibility = 'visible';
    mainContainer.classList.add('blurred');

    // 使用 dom-to-image 导出为图片
    domtoimage.toBlob(mapExportDiv)
        .then(function (blob) {
            // 创建一个下载链接
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob); // 将 Blob 转换为 URL
            link.download = 'map-export.png'; // 设置下载文件名
            link.click(); // 触发点击事件下载
        })
        .catch(function (error) {
            console.error('Error exporting map:', error);
            alert('导出失败，请重试！');
        })
        .finally(function () {
            // 隐藏遮罩层，并恢复页面
            loadingMask.style.visibility = 'hidden';
            mainContainer.classList.remove('blurred');
        });
}



function changeBorderColor(element) {
    // Create a temporary color input element
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = rgbToHex(element.querySelector('.legend-color-box').style.borderColor);

    // Position the color input element
    colorInput.style.position = 'absolute';
    colorInput.style.left = `${element.getBoundingClientRect().left + 50}px`;  // Adjust position as needed
    colorInput.style.top = `${element.getBoundingClientRect().top + 20}px`;   // Adjust position as needed
    colorInput.style.opacity = '0'; // Hide the input itself
    colorInput.style.pointerEvents = 'none'; // Prevent input from interfering with other UI elements

    // Append the color input to the document body
    document.body.appendChild(colorInput);

    // Listen for color change
    colorInput.addEventListener('input', function () {
        element.querySelector('.legend-color-box').style.borderColor = colorInput.value;
    });

    // Simulate a click on the color input to open the color picker
    colorInput.click();

    // Remove the color input after the color has been picked
    colorInput.addEventListener('change', function () {
        document.body.removeChild(colorInput);
    });
}

// Helper function to convert RGB color to HEX
function rgbToHex(rgb) {
    if (!rgb) return '#3498db'; // Default color

    // Extract rgb values from rgb(r,g,b) string
    const result = rgb.match(/\d+/g);
    if (!result) return '#3498db';

    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Function to show the upload card
function showUploadCard() {
    const uploadCard = document.getElementById('upload-card');
    uploadCard.style.display = 'block';
}

// Function to hide the upload card
function hideUploadCard() {
    const uploadCard = document.getElementById('upload-card');
    uploadCard.style.display = 'none';
}
// Function to handle file selection and display file names
document.getElementById('shapefiles').addEventListener('change', function () {
    const fileInput = document.getElementById('shapefiles');
    const fileNamesDiv = document.getElementById('file-names');
    const files = fileInput.files;

    // Clear the current content
    fileNamesDiv.innerHTML = '';

    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const fileNameDiv = document.createElement('div');
            fileNameDiv.textContent = files[i].name;
            fileNamesDiv.appendChild(fileNameDiv);
        }
    }
});