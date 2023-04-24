
var map = L.map('map').setView([50.974617306552084, 11.028127670288088], 14);
// map.options.minZoom = 8;
// map.options.maxZoom = 11;

const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
});

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17,
    attribution: 'Esri Base Map'
});

var basemapCarto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 20,
    noWrap: true
}).addTo(map);

var baseLayers = {
    'Carto': basemapCarto,
    'OSM': osm,
    'Satellite': Esri_WorldImagery,
};

var layerControl = L.control.layers(baseLayers).addTo(map);
let loc = {};

var lc = L.control.locate({
    showCompass: true,
    flyTo: true,
    locateOptions: {
        enableHighAccuracy: true
    }
}).addTo(map);
lc.start();

let first = true;
map.on('locationfound', (e) => {
    loc.lat = e.latlng.lat;
    loc.lng = e.latlng.lng;
    if (first)
        update_layers(loc.lat, loc.lng);
    first = false;

})

let input_radius = L.control({ position: "topleft" });
input_radius.onAdd = function () {
    let div = L.DomUtil.create("div", "input_radius");
    div.innerHTML = 'Radius: <input id="input_radius" type="number" value="500" min="50" max="40000" onchange="change_radius_input()"/><br>' +
        '<input type="range" min="50" max="40000" value="500" class="range blue" id="slider_radius" onchange="change_radius_slider()">';
    return div;
};
input_radius.addTo(map);
// let circle = L.layerGroup().addTo(map);
let traffic_line = L.layerGroup().addTo(map);
let incident_line = L.layerGroup().addTo(map);
let ttkey = 'gn1FZlpkkRXNQ9lUIt0jZQhLGxylnyqA';
let circle;
let polyline;

let panel = document.getElementsByClassName('input_radius')[0];
L.DomEvent.disableClickPropagation(panel);
L.DomEvent.disableScrollPropagation(panel);
let radius = document.getElementById('input_radius').value;

function change_radius_input() {
    radius = document.getElementById('input_radius').value;
    document.getElementById('slider_radius').value = radius;
    console.log(radius);
    if (loc) {
        update_layers(loc.lat, loc.lng);
    }
}
function change_radius_slider() {
    radius = document.getElementById('slider_radius').value;
    document.getElementById('input_radius').value = radius;
    console.log(radius);
    if (loc) {
        update_layers(loc.lat, loc.lng);
    }
}

function update_layers(lat, lng) {
    if (circle) {
        map.removeLayer(circle);
    }
    traffic_line.clearLayers();
    incident_line.clearLayers();
    circle = L.circle([lat, lng], {
        color: 'blue',
        fillColor: '#f03',
        fillOpacity: 0,
        radius: radius
    }).addTo(map);
    bbox = circle.getBounds();
    map.fitBounds(bbox);

    $.ajax({
        url: 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json',
        type: 'GET',
        data: {
            key: ttkey,
            point: lat + ',' + lng,
            radius: radius
        },
        success: function (data) {
            
            let arr = data.flowSegmentData.coordinates.coordinate;
            let latlngs = [];
            for (let i = 0; i < arr.length; i++) {
                latlngs.push([arr[i].latitude, arr[i].longitude]);
            }
            let line = L.polyline([latlngs], { color: 'green' }).addTo(traffic_line);
            line.setText(data.flowSegmentData.currentSpeed + ' kmph', {offset: -5});
        }
    });
    
}

map.on('click', function (e) {
    loc = e.latlng;
    console.log(loc);
    update_layers(loc.lat, loc.lng);
});
