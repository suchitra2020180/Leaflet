var mapcenter = [21.00,78.73];
var map = L.map('map', {zoomControl: false}).setView(mapcenter, 5);


// Displaying Map layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'unsorry'
}).addTo(map);

var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
	maxZoom: 17,
	attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
}).addTo(map);

googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3']
});
googleSat.addTo(map);




//Reference:https://github.com/anshori/anshori.github.io

// Zoom Control icons
var zoomControl = L.control.zoom({
  position: "topleft"
});
zoomControl.addTo(map);

// Leaflet Draw item icons
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
var drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    poly : {
      allowIntersection : false
    }
  },
  draw: {
    circle: false,
    circlemarker: false,
    polygon : {
      allowIntersection: false,
      showArea:true
    }
  }
});
map.addControl(drawControl);


// Rounding off the lat and long values up to 6 decimals
// Roundoff the num value based on len of the number
var _round = function(num, len) {
  return Math.round(num*(Math.pow(10, len)))/(Math.pow(10, len));
};
// Helper method to format LatLng object to 6 decimals each (x.xxxxxx, y.yyyyyy)
var strLatLng = function(latlng) {
  return "("+_round(latlng.lat, 6)+", "+_round(latlng.lng, 6)+")";
};

// Generate popup content based on drawn feature
// - Returns HTML string, or null if unknown object
var getPopupContent = function(layer) {
  // when we add a marker to map,it will show the lat and long for the marker or circle marker
  if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
    return strLatLng(layer.getLatLng());
  // when we draw a Circle, it returns  lat/long, radius
  } else if (layer instanceof L.Circle) {
    var center = layer.getLatLng(),
      radius = layer.getRadius();
    return "Center: "+strLatLng(center)+"<br />"
      +"Radius: "+_round(radius, 2)+" m";
  // Rectangle/Polygon - returns  area
  } else if (layer instanceof L.Polygon) {
    var latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
      area = L.GeometryUtil.geodesicArea(latlngs);
    return "Area: "+L.GeometryUtil.readableArea(area, true);
  // For Polyline - returns distance
  } else if (layer instanceof L.Polyline) {
    var latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
      distance = 0;
    if (latlngs.length < 2) {
      return "Distance: N/A";
    } else {
      for (var i = 0; i < latlngs.length-1; i++) {
        distance += latlngs[i].distanceTo(latlngs[i+1]);
      }
      //Conversion of distance to km and m
      if (_round(distance, 2) > 1000) {
        return "Distance: "+_round(distance, 2)/1000 + " km"; // kilometers
      } else {
        return "Distance: "+_round(distance, 2) + " m"; // meters
      }
    }
  }
  return null;
};

// Object created - bind popup to layer, add to feature group
//Adds event listener to the map for the event created.
map.on(L.Draw.Event.CREATED, function(event) {
    //event.layer represents the layer just drawn by the user
  var layer = event.layer;
  //Shows the popup, if there is any content to display in that layer
  var content = getPopupContent(layer);
  if (content !== null) {
    layer.bindPopup(content);
  }
  // Add info to feature properties
  //feature= if layer.feature is present keep the feature as it is = if the layer.feature is not present then intialise it as {}
  feature = layer.feature = layer.feature || {};
  //Assiging the feature type as Feature
  feature.type = feature.type || "Feature";
  //Assign properties to each feature
  var props = feature.properties = feature.properties || {}; // Intialize feature.properties
  //we will content from getPopContent
  props.info = content;
  drawnItems.addLayer(layer);
  console.log(JSON.stringify(drawnItems.toGeoJSON()));
});

// Object(s) edited - update popups
//To update the fature properties, clear the previous feature properties in content
map.on(L.Draw.Event.EDITED, function(event) {
  var layers = event.layers,
    content = null;
  layers.eachLayer(function(layer) {
    content = getPopupContent(layer);
    if (content !== null) {
      layer.setPopupContent(content);
    }

    // Update info to feature properties
    var layer = layer;
    feature = layer.feature = layer.feature || {};
    var props = feature.properties = feature.properties || {};
    props.info = content;
  });
  console.log(JSON.stringify(drawnItems.toGeoJSON()));
});

// Object(s) deleted - update console log
map.on(L.Draw.Event.DELETED, function(event) {
  console.log(JSON.stringify(drawnItems.toGeoJSON()));
});

// *****************        Assign a title to the Map at the bottomleft
var title = new L.Control({position: 'bottomleft'});
title.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};
title.update = function () {
  this._div.innerHTML = 'Create some features<br>with drawing tools<br>then export to geojson file'
};
title.addTo(map);



/*===================================
// Export Button
====================================*/
var showExport = '<a href="#" onclick="geojsonExport()" title="Export to GeoJSON File" type="button" class="btn btn-danger btn-sm text-light"><i class="fa fa-file-code-o" aria-hidden="true"></i> Export</a>';

var showExportButton = new L.Control({position: "topright"});
showExportButton.onAdd = function (map) {
  this._div = L.DomUtil.create('div');
  this._div.innerHTML = showExport
  return this._div;
};
showExportButton.addTo(map);

/*================================
// Export to GeoJSON File
=================================*/
function geojsonExport(){
  let nodata = '{"type":"FeatureCollection","features":[]}';
  let jsonData = (JSON.stringify(drawnItems.toGeoJSON()));
  let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonData);
  let datenow = new Date();
  let datenowstr = datenow.toLocaleDateString('en-GB');
  let exportFileDefaultName = 'export_draw_'+ datenowstr + '.geojson';
  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  if (jsonData == nodata) {
    alert('No features are drawn');
  } else {
    linkElement.click();
  }
}




//Adding .jpg images to the map
//var imageOverlay = L.imageOverlay(imageUrl, latLngBounds, options);
//var imageUrl = 'https://maps.lib.utexas.edu/maps/historical/newark_nj_1922.jpg';
var imageUrl ='img/Final Classification.jpg'
var errorOverlayUrl = 'https://cdn-icons-png.flaticon.com/512/110/110686.png';
var altText = 'Image of Newark, N.J. in 1922. Source: The University of Texas at Austin, UT Libraries Map Collection.';
var ImageBounds = L.latLngBounds([[26.37707, 92.958069], [25.992612, 93.724365]]);

var imageOverlay = L.imageOverlay(imageUrl, ImageBounds, {
    opacity: 0.8,
    errorOverlayUrl: errorOverlayUrl,
    alt: altText,
    interactive: true
}).addTo(map);


var baseLayers = {
  "Google satellite": googleSat,
  "OpenStreetMap": osm,
  "Open Topo Map":OpenTopoMap,
  //"Overlay":imageOverlay
};
var Overlays={
  "Classified Image":imageOverlay,

}

L.control.layers(baseLayers, Overlays).addTo(map)

/*====================================
                Loading Geojson files
=======================================*/
var polygondata = L.geoJSON(polygonJSON,{
  onEachFeature: function(feature,layer){
      layer.bindPopup('<b>This is a </b>' + feature.properties.name)
  },
  style:{
      fillColor: 'red',
      fillOpacity:1,
      color: 'green'
  }
}).addTo(map);


/*==========================================
                Adding shapefile directly
=======================================*/
// Example Shapefile URL (replace with the path or URL to your Shapefile)
//var shapefileUrl = 'img/Dhima_hasao_NEW.zip';

var shapefileUrl = 'img/Dhima_hasao_NEW.zip';

// Use Leaflet-Omnivore to load the Shapefile
omnivore.shp(shapefileUrl).addTo(map);

//Adding a folder to the map


//=====================================Adding coordinates to the cursor position ********************************* not working
// Display cursor coordinates in a div
var coordinatesDiv = document.getElementById('coordinates');

// Event handler for mousemove
function onMapMouseMove(e) {
  coordinatesDiv.innerHTML = 'Cursor Coordinates: ' + e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5);
}

// Attach the event handler to the map
map.on('mousemove', onMapMouseMove);


//======================Adding shape file of India and its districts after converting to geojson=========================================not working
// Example GeoJSON URL (replace with the path or URL to your India GeoJSON file)
var geojsonUrl = 'path/to/your/output.geojson';

// Use Leaflet.ajax to load GeoJSON data
L.geoJson.ajax(geojsonUrl).addTo(map);

/*===========================
          DISPLAYING MAP COORDINATES
=============================*/


 // Display coordinates when the cursor is moved
 map.on('mousemove', function (e) {
  // Get the coordinates from the mouse event
  var lat = e.latlng.lat.toFixed(6);
  var lng = e.latlng.lng.toFixed(6);

  // Display the coordinates in the designated HTML element
  document.getElementById('coordinates').innerHTML = 'Latitude: ' + lat + '<br>Longitude: ' + lng;
});


map.on('mousemove',function(e){
  console.log(e)
  $('.coodinate').html('Lat: ${e.latlng.lat} Lng: ${e.latlng.lng}')
})