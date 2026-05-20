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
// LANDSAT 5 BAND RENAME
// (aligned to Landsat 8 naming)
// ================================
var renameL5 = function(img) {

  return img.select(
    ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'],
    ['Blue','Green','Red','NIR','SWIR1','SWIR2']
  );
};


// ================================
// SCALE FACTOR (L5 = same formula in C2 L2)
// ================================
var scaleL5 = function(img) {

  var optical = img.select(['Blue','Green','Red','NIR','SWIR1','SWIR2'])
    .multiply(0.0000275)
    .add(-0.2);

  return img.addBands(optical, null, true);
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
// LANDSAT 5 ADAPTED GETCOMPOSITE
// ================================
function getCompositeL5(start, end) {

  return ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')

    .filterDate(start, end)
    .filterBounds(roi)

    // same seasonal logic as L8 (for consistency)
    // .filter(ee.Filter.calendarRange(11, 3, 'month'))

    .map(maskClouds)
    .map(renameL5)
    .map(scaleL5)
    .map(addIndices)

    .median()
    .clip(roi)
    .toFloat();
}


// ================================
// BUILD 1999 IMAGE
// ================================
var img1999 = getCompositeL5(
  '1998-01-01',
  '2000-12-31'
);


// ================================
// ADD TO MAP
// ================================
// ================================
// Visualization Parameters
// ================================
var vis = {
  bands: ['Red','Green','Blue'],
  min: 0,
  max: 0.3,
  gamma: 1.3
};
Map.addLayer(img1999, vis, '1999 Composite');


// ================================
// EXPORT (aligned with Landsat 8)
// ================================
Export.image.toDrive({

  image: img1999,

  description: 'Osun_Landsat_1999',

  folder: 'GEE_Exports',

  fileNamePrefix: 'Osun_Landsat_1999',

  region: roi,

  scale: 30,

  crs: 'EPSG:4326',

  maxPixels: 1e13
});

