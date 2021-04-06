var mapStyle = "mapbox://styles/das-dominator/cklvb10rz2nua17myhifdi8xe";
mapboxgl.accessToken =
    "pk.eyJ1IjoiZGFzLWRvbWluYXRvciIsImEiOiJjaWdwcHlhOGEwMTk3dTZtMTFoOWlhODRuIn0" +
    ".EMMUXq7iUiiTGYicBf_3DQ";

// var msaBaseLayer = "MSA color shading test";
// var msaOutlineLayer = "may-2020-yoy-growth-dmu1ab copy-MSA Outlines";

var defaultBounds = [
    [-137.13503318482543, 17.84747663287095],
    [-49.13721841667436, 52.341752486020994]
];

function resizeMap() {
    var jumbotronHeight = document.querySelector(".jumbotron").clientHeight;
    document.querySelector("#map-container").style.height =
        "calc(100% - " + jumbotronHeight + "px)";
}

resizeMap();

var travelTimeDiv = document.querySelector("#drive-time");

var alertText = $("#alert-text");

var map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle
});

var isoDelayMs = 1950;

map.on('load', function () {

    map.fitBounds(defaultBounds);

    var scale = new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'imperial'
    });
    map.addControl(scale);

    // Move the Geocoder to the jumbotron.
    var geocoderDiv = document.querySelector(".mapboxgl-ctrl-geocoder");
    geocoderDiv.id = "geocoder";
    document.querySelector("#geocoder-container").appendChild(geocoderDiv);
    geocoderDiv.style.setProperty("display", "block", "important");

    resizeMap();

    // map.setLayoutProperty(msaBaseLayer, 'visibility', 'none');
    // map.setLayoutProperty(msaOutlineLayer, 'visibility', 'none');

    map.addSource('iso', {
        type: 'geojson',
        data: {
            "type": 'FeatureCollection',
            "features": []
        }
    });

    map.addSource('CBSAs', {
        type: 'geojson',
        data: {
            "type": 'FeatureCollection',
            "features": []
        }
    });

    map.addSource('counties', {
        type: 'geojson',
        data: {
            "type": 'FeatureCollection',
            "features": []
        }
    });

    map.addLayer({
        'id': 'isoLayer',
        'type': 'fill',
        'source': 'iso',
        'layout': {},
        'paint': {
            'fill-color': '#5a3fc0',
            'fill-opacity': 0.15
        }
    }, "poi-label");

    map.addLayer({
        'id': 'CBSAsLayer',
        'type': 'fill',
        'source': 'CBSAs',
        'layout': {},
        'paint': {
            'fill-color': '#45b6fe',
            'fill-opacity': 0.2
        }
    }, "poi-label");

    map.addLayer({
        'id': 'CBSAsLayerOutline',
        'type': 'line',
        'source': 'CBSAs',
        'layout': {},
        'paint': {
            'line-color': '#000000',
            'line-width': 2
        }
    }, "poi-label");

    map.addLayer({
        'id': 'countiesLayer',
        'type': 'fill',
        'source': 'counties',
        'layout': {},
        'paint': {
            'fill-color': '#45b6fe',
            'fill-opacity': 0.2
        }
    }, "poi-label");

    map.addLayer({
        'id': 'countiesLayerOutline',
        'type': 'line',
        'source': 'counties',
        'layout': {},
        'paint': {
            'line-color': '#000000',
            'line-width': 2
        }
    }, "poi-label");

    map.on('click', 'CBSAsLayer', function (e) {
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML('<h4>' + e.features[0].properties.NAME + '</h4>')
            .addTo(map);
    });

    map.on('mouseenter', 'CBSAsLayer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'CBSAsLayer', function () {
        map.getCanvas().style.cursor = '';
    });

    map.on('click', 'countiesLayer', function (e) {
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML('<h4>' + e.features[0].properties.NAME + '</h4>')
            .addTo(map);
    });

    map.on('mouseenter', 'countiesLayer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'countiesLayer', function () {
        map.getCanvas().style.cursor = '';
    });
});


var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    countries: "us",
    flyTo: false,
    marker: {
        color: 'orange'
    },
    mapboxgl: mapboxgl
});

map.addControl(geocoder);

geocoder.on("result", function (e) {
    $(".alert").show();
    alertText.html("Location found!");
    getIsoAndSuggestedRegions(e.result.center);
});

function resetMap() {
    $(".alert").hide();
    alertText.html("");
    $(".spinner-grow").show();
    $('.mapboxgl-popup').remove();

    map.getSource('CBSAs').setData({
        type: "FeatureCollection",
        features: []
    });

    map.getSource('counties').setData({
        type: "FeatureCollection",
        features: []
    });

    map.getSource('iso').setData({
        type: "FeatureCollection",
        features: []
    });

    map.fitBounds(defaultBounds);
}


geocoder.on("clear", function (e) {
    resetMap();
});


function findSuggestedRegions(
    region_type, coordinates, regionFeatures, isochroneFeatures
) {
    var isochronePoly = turf.polygon(
        isochroneFeatures[0].geometry.coordinates
    );

    var data = [];
    var newCoordinates = new mapboxgl.LngLat(
        coordinates[0],
        coordinates[1]
    );
    var bounds = new mapboxgl.LngLatBounds(
        newCoordinates[0],
        newCoordinates[1]
    );

    for (var i = 0; i < regionFeatures.length; i++) {
        var pieces = regionFeatures[i].geometry.coordinates.map(function (c) {
            return turf.polygon(c);
        });

        var intersects = pieces.some(function (piece) {
            return turf.intersect(piece, isochronePoly);
        });

        if (intersects) {
            data.push(regionFeatures[i]);

            regionFeatures[i].geometry.coordinates.forEach(function (mpoly) {
                mpoly.forEach(function (polygon) {
                    polygon.forEach(function (pair) {
                        bounds.extend(pair);
                    });
                });
            });
        }
    }

    map.getSource(region_type).setData({
        type: "FeatureCollection",
        features: data
    });

    if (data.length) {
        map.fitBounds(bounds, { padding: 75 });
        map.once("moveend", function () {
            alertText.html(
                data.length +
                " nearby " +
                region_type +
                " found.  Click on a " +
                (region_type === "CBSAs" ? "CBSA" : "county") +
                " for more info."
            );
            $(".spinner-grow").hide();
        });
    }
}


// Isochrones
var urlBase = 'https://api.mapbox.com/isochrone/v1/mapbox/';
var lon = -77.034;
var lat = 38.899;
var profile = 'driving';
var minutes = 60;

function getIsoAndSuggestedRegions(coordinates) {
    var query =
        urlBase +
        profile +
        '/' +
        coordinates[0] +
        ',' +
        coordinates[1] +
        '?contours_minutes=' +
        parseInt(travelTimeDiv.selectedOptions[0].value, 10) +
        '&polygons=true&access_token=' +
        mapboxgl.accessToken;

    $.ajax({
        method: 'GET',
        url: query
    }).done(function (data) {

        if (!data) return;

        map.getSource('iso').setData(data);
        map.setPaintProperty("isoLayer", "fill-opacity", 0.0);
        map.setLayoutProperty("isoLayer", 'visibility', 'visible');

        var newCoordinates = new mapboxgl.LngLat(
            coordinates[0],
            coordinates[1]
        );
        var bounds = new mapboxgl.LngLatBounds(
            newCoordinates[0],
            newCoordinates[1]
        );

        data.features.forEach(function (feature) {
            feature.geometry.coordinates.forEach(function (polygon) {
                polygon.forEach(function (pair) {
                    bounds.extend(pair);
                });
            });
        });

        map.fitBounds(bounds, { padding: 75 });

        map.once('moveend', function () {

            alertText.html(
                "Searching for " +
                $('#region-type input:radio:checked').val() +
                " within a " +
                parseInt(travelTimeDiv.selectedOptions[0].value, 10) +
                " minute drive..."
            );

            var fillOpacity = 0;
            var posDirection = true;
            var rate = 0.5;
            var fillOpacityMax = 0.3;

            var isoDelay = setInterval(function () {
                if (fillOpacity === fillOpacityMax) {
                    posDirection = false;
                    fillOpacity = fillOpacityMax - (1 / 30 * rate);
                } else if (fillOpacity === 0) {
                    posDirection = true;
                    fillOpacity = (1 / 30 * rate);
                } else if (posDirection) {
                    fillOpacity =
                        Math.min(fillOpacityMax, fillOpacity += (1 / 30 * rate));
                } else {
                    fillOpacity = Math.max(0, fillOpacity - (1 / 30 * rate));
                }

                map.setPaintProperty("isoLayer", 'fill-opacity', fillOpacity);
            }, 30);

            setTimeout(function () {
                clearInterval(isoDelay);
                findSuggestedRegions(
                    $('#region-type input:radio:checked').val(),
                    coordinates,
                    $('#region-type input:radio:checked').val() === "CBSAs" ?
                        CBSAs.features :
                        counties.features,
                    data.features
                );
            }, isoDelayMs);
        });
    });
}
