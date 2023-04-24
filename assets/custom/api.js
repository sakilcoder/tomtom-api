let ttkey = 'gn1FZlpkkRXNQ9lUIt0jZQhLGxylnyqA';

var map = L.map('map').setView([50.974617306552084, 11.028127670288088], 14);
// map.options.minZoom = 8;
// map.options.maxZoom = 11;

const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17,
    attribution: 'Esri Base Map'
});

var basemapCarto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 20,
    noWrap: true
});

var baseLayers = {
    'OSM': osm,
    'Carto': basemapCarto,
    'Satellite': Esri_WorldImagery,
};

var layerControl = L.control.layers(baseLayers).addTo(map);

var traffic = L.tileLayer('https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key={apiKey}', {
    apiKey: ttkey,
    maxZoom: 20
}).addTo(map);


let loc = {};

var lc = L.control.locate({
    showCompass: true,
    flyTo: true,
    // metric: false,
    drawCircle: false,
    // follow: true, 
    // setView: true, 
    keepCurrentZoomLevel: false,
    markerStyle: {
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.8
    },
    locateOptions: {
        enableHighAccuracy: true
    }
}).addTo(map);
lc.start();

let first = true;
map.on('locationfound', (e) => {
    // console.log(e);
    loc.lat = e.latlng.lat;
    loc.lng = e.latlng.lng;

    // if (first)
        update_layers(loc.lat, loc.lng);
    // first = false;

})

let input_radius = L.control({ position: "topleft" });
input_radius.onAdd = function () {
    let div = L.DomUtil.create("div", "input_radius");
    div.innerHTML = 'Radius: <input id="input_radius" type="number" value="500" min="50" max="10000" onchange="change_radius_input()"/><br>' +
        '<input type="range" min="50" max="10000" value="500" class="range blue" id="slider_radius" onchange="change_radius_slider()">';
    return div;
};
input_radius.addTo(map);
// let circle = L.layerGroup().addTo(map);
let traffic_line = L.layerGroup().addTo(map);
let incident_line = L.layerGroup().addTo(map);

let circle;
let polyline;

let panel = document.getElementsByClassName('input_radius')[0];
L.DomEvent.disableClickPropagation(panel);
L.DomEvent.disableScrollPropagation(panel);
let radius = document.getElementById('input_radius').value;

function change_radius_input() {
    radius = document.getElementById('input_radius').value;
    document.getElementById('slider_radius').value = radius;
    // console.log(radius);
    if (loc) {
        update_layers(loc.lat, loc.lng);
    }
}
function change_radius_slider() {
    radius = document.getElementById('slider_radius').value;
    document.getElementById('input_radius').value = radius;
    // console.log(radius);
    if (loc) {
        update_layers(loc.lat, loc.lng);
    }
}



function get_property(d) {
    if (d == 0) return { color: "#641013", value: "Unknown" };
    if (d == 1) return { color: "#7d1418", value: "Accident" };
    if (d == 2) return { color: "#96181c", value: "Fog" };
    if (d == 3) return { color: "#af1c21", value: "Dangerous Conditions" };
    if (d == 4) return { color: "#c82026", value: "Rain" };
    if (d == 5) return { color: "#e1242b", value: "Ice" };
    if (d == 6) return { color: "#fb2930", value: "Jam" };
    if (d == 7) return { color: "#fb3e44", value: "Lane Closed" };
    if (d == 8) return { color: "#fb5359", value: "Road Closed" };
    if (d == 9) return { color: "#fc696e", value: "Road Works" };
    if (d == 10) return { color: "#fc7e82", value: "Wind" };
    if (d == 11) return { color: "#fd9497", value: "Flooding" };
    if (d == 14) return { color: "#fda9ac", value: "Broken Down Vehicle" };
    return null;
}

// 0: Unknown
// 1: Accident
// 2: Fog
// 3: Dangerous Conditions
// 4: Rain
// 5: Ice
// 6: Jam
// 7: Lane Closed
// 8: Road Closed
// 9: Road Works
// 10: Wind
// 11: Flooding
// 14: Broken Down Vehicle

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

    console.log(bbox);
    map.fitBounds(bbox);

    fetch('https://api.tomtom.com/traffic/services/5/incidentDetails?key=' + ttkey + '&bbox=' + bbox._northEast.lng + ',' + bbox._northEast.lat + ',' + bbox._southWest.lng + ',' + bbox._southWest.lat)
        .then(response => response.json())
        .then(data => {
            let legendValues = [];
            data.incidents.forEach(incident => {
                // console.log(incident);
                if (incident.geometry.type == 'LineString') {
                    let arr = incident.geometry.coordinates;
                    let latlngs = [];
                    for (let i = 0; i < arr.length; i++) {
                        latlngs.push([arr[i][1], arr[i][0]]);
                    }
                    let prop = get_property(incident.properties.iconCategory);
                    // console.log(prop);
                    let line = L.polyline([latlngs], { color: prop.color, dashArray: '4, 4' }).addTo(traffic_line);
                    line.setText(prop.value, { offset: -5 });
                    legendValues.push(incident.properties.iconCategory)
                }
            });
            // console.log(legendValues);
            legendValues = _.uniq(legendValues);
            let leg = document.getElementById('legend');
            leg.innerHTML = '';
            for (i = 0; i < legendValues.length; i++) {
                let obj = get_property(legendValues[i]);
                if (obj != null)
                    leg.innerHTML += '<b><span style="color: ' + obj.color + '; font-size: 20px">- - -</span>' + obj.value + '</b> | ';

            }
        });

    fetch('https://api.tomtom.com/traffic/services/5/incidentDetails?key='+ ttkey + '&bbox=' + bbox._northEast.lng + ',' + bbox._northEast.lat + ',' + bbox._southWest.lng + ',' + bbox._southWest.lat + '&fields={incidents{type,geometry{type,coordinates},properties{iconCategory}}}', {
        Your_Api_Key: ttkey,
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
        });



}



map.on('click', function (e) {
    loc = e.latlng;
    // console.log(loc);
    update_layers(loc.lat, loc.lng);
});

// legend with variable name in title as well as colors and corresponding values
let legend = L.control({ position: "bottomright" });
legend.onAdd = function () {
    let div = L.DomUtil.create("div", "legend");
    div.innerHTML =
        '<span id="legend"></span>';
    return div;
};
legend.addTo(map);

