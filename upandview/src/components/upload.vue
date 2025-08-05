<script setup lang="ts">
import { ref, onMounted } from 'vue';
import L from 'leaflet';

// Map related refs
const map = ref<L.Map | null>(null);
const currentLayer = ref<L.GeoJSON | null>(null);

// Data-related refs
const tableSelect = ref<string | null>(null);
const fields = ref<string[]>([]);
const rows = ref<Record<string, any>[]>([]);
const selectedFields = ref<string[]>([]);

// Initialize map on component mount
onMounted(() => {
    map.value = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map.value);

    loadTableList();
});

// Fetch and display table list
const loadTableList = async () => {
    const response = await fetch('http://127.0.0.1:5000/tables');
    const tables = await response.json();
    tableSelect.value = tables[0];
    if (tableSelect.value) {
        loadTableData(tableSelect.value);
    }
};

// Fetch and display table data on the map
const loadTableData = async (tableName: string) => {
    const response = await fetch(`http://127.0.0.1:5000/data/${tableName}`);
    const data = await response.json();

    if (currentLayer.value) {
        map.value?.removeLayer(currentLayer.value);
    }

    currentLayer.value = L.geoJSON(data, {
        onEachFeature: onEachFeature,
    }).addTo(map.value as L.Map);

    map.value?.fitBounds(currentLayer.value.getBounds());
    loadTableFields(tableName);
};

// Fetch and display table fields
const loadTableFields = async (tableName: string) => {
    const response = await fetch(`http://127.0.0.1:5000/fields/${tableName}`);
    const data = await response.json();
    fields.value = data.fields;
    rows.value = data.data;
};

// Update displayed attributes based on selected fields
const updateAttributes = () => {
    const attributes = rows.value.map(row => {
        return selectedFields.value.reduce((acc, field) => {
            if (row[field] !== undefined) {
                acc[field] = row[field];
            }
            return acc;
        }, {} as Record<string, any>);
    });

    return attributes;
};

// Handle feature click event
const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on('click', updateAttributes);
};

// Handle shapefile upload
const uploadShapefile = async () => {
    const formData = new FormData();
    const input = document.getElementById('shapefiles') as HTMLInputElement;

    if (input.files?.length === 0) {
        alert('Please select files to upload.');
        return;
    }

    Array.from(input.files).forEach(file => formData.append('shapefiles', file));

    try {
        const response = await fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        alert(result.join('\n'));
        loadTableList();
    } catch (error) {
        console.error('Error:', error);
    }
};
</script>

<template>
  <h1>Shapefile Uploader and Map Viewer</h1>

  <h2>Upload Shapefile</h2>
  <form id="uploadForm" enctype="multipart/form-data">
    <input type="file" id="shapefiles" name="shapefiles" accept=".shp,.shx,.dbf" multiple />
    <button type="button" @click="uploadShapefile">Upload</button>
  </form>

  <h2>View Shapefile Data</h2>
  <label for="table-select">Select a Table:</label>
  <select v-model="tableSelect" @change="loadTableData(tableSelect)">
    <option v-for="table in tables" :key="table" :value="table">{{ table }}</option>
  </select>

  <div id="fields">
    <div v-for="field in fields" :key="field">
      <input type="checkbox" :id="field" :value="field" v-model="selectedFields" @change="updateAttributes" />
      <label :for="field">{{ field }}</label>
    </div>
  </div>

  <div id="container">
    <div id="map" style="width: 70%; height: 600px;"></div>
    <div id="info-card">
      <h3>Selected Attributes</h3>
      <div id="attributes">
        <div v-for="attribute in updateAttributes()" :key="attribute">
          {{ JSON.stringify(attribute, null, 2) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#container {
    display: flex;
    margin-top: 20px;
}
#map {
    width: 70%;
    height: 600px;
}
#info-card {
    width: 30%;
    height: 600px;
    overflow-y: auto;
    padding: 10px;
    border-left: 1px solid #ccc;
    background-color: #f9f9f9;
}
#fields {
    margin-bottom: 20px;
}
</style>
