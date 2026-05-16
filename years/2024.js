// ==========================================
// ROI: NIGERIA STATE + BUFFER
// ==========================================

// Load Nigeria ADM1 (State boundaries)
var states = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Nigeria'));


// ==========================================
// SELECT STATE
// Change the state name here
// ==========================================
var stateName = 'Osun';

// ==========================================
// FILTER STATE
// ==========================================
var state = states.filter(
  ee.Filter.eq('ADM1_NAME', stateName)
);


// ==========================================
// BUFFER THE STATE
// Buffer distance in meters
// Example:
// 5000  = 5 km
// 10000 = 10 km
// ==========================================
var bufferDistance = 10000;


// Apply buffer
var roi = state.geometry().buffer(bufferDistance);


// ==========================================
// DISPLAY
// ==========================================
Map.centerObject(roi, 8);

Map.addLayer(
  roi,
  {color: 'blue'},
  stateName + ' Buffered ROI'
);

// ================================
// Bands to Use
// ================================
var bands = ['Blue','Green','Red','NIR','SWIR1','SWIR2'];

// ================================
// Landsat 8 Band Rename
// ================================
var renameL8 = function(img) {

  return img.select(
    ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
    bands
  );
};

// ================================
// Apply Scale Factors
// ================================
var scale = function(img) {

  var opticalBands = img.select(bands)
    .multiply(0.0000275)
    .add(-0.2);

  return img.addBands(opticalBands, null, true);
};

// ================================
// Improved Cloud Mask
// ================================
var maskClouds = function(img) {

  var qa = img.select('QA_PIXEL');

  // Remove:
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow

  var mask = qa.bitwiseAnd(1 << 1).eq(0)
    .and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0));

  // Remove saturated pixels
  var satMask = img.select('QA_RADSAT').eq(0);

  return img.updateMask(mask)
            .updateMask(satMask);
};

// ================================
// Add Spectral Indices
// ================================
var addIndices = function(img) {

  var ndvi = img.normalizedDifference(['NIR','Red'])
    .rename('NDVI').toFloat();

  var ndbi = img.normalizedDifference(['SWIR1','NIR'])
    .rename('NDBI').toFloat();

  var mndwi = img.normalizedDifference(['Green','SWIR1'])
    .rename('MNDWI').toFloat();

  return img.addBands([ndvi, ndbi, mndwi]);
};

// ================================
// Build Composite Function
// ================================
function getComposite(start, end, sensor, renamer) {

  return ee.ImageCollection(sensor)

    // Date filtering
    .filterDate(start, end)
    .filterBounds(roi)

    // Dry season filter
    // November -> March
    .filter(ee.Filter.calendarRange(11, 3, 'month'))

    // Processing steps
    .map(maskClouds)
    .map(renamer)
    .map(scale)
    .map(addIndices)
    .median()
    .clip(roi);
}

// ================================
// MODERN COMPOSITES
// Landsat 8
// ================================

// 2014 Composite
var img2024 = getComposite(
  '2022-01-01',
  '2024-12-31',
  'LANDSAT/LC08/C02/T1_L2',
  renameL8
).toFloat();

// ================================
// Visualization Parameters
// ================================
var vis = {
  bands: ['Red','Green','Blue'],
  min: 0,
  max: 0.3,
  gamma: 1.3
};

// ================================
// Add Layers to Map
// ================================
Map.addLayer(img2024, vis, '2024 Composite');

// ==========================================
// EXPORT TO GOOGLE DRIVE
// ==========================================

Export.image.toDrive({

  // Image to export (change this per year)
  image: img2024,

  // Task name in GEE Tasks tab
  description: 'Osun_Landsat_2024',

  // Google Drive folder name
  folder: 'GEE_Exports',

  // Output file name
  fileNamePrefix: 'Osun_Landsat_2024',

  // Region of interest (your buffered state)
  region: roi,

  // Spatial resolution (Landsat = 30 m)
  scale: 30,

  // Coordinate reference system
  crs: 'EPSG:4326',

  // Prevent export failure for large regions
  maxPixels: 1e13
});