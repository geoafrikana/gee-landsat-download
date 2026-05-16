// ==========================================
// LANDSAT 7 - 1999 (L8-ALIGNED OUTPUT)
// ==========================================


// ================================
// ROI (same as your L8 workflow)
// ================================
var states = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Nigeria'));

var stateName = 'Osun';

var state = states.filter(
  ee.Filter.eq('ADM1_NAME', stateName)
);

var roi = state.geometry().buffer(10000);

Map.centerObject(roi, 8);


// ================================
// STANDARD BAND NAMES (L8 FORMAT)
// ================================
var bands = ['Blue','Green','Red','NIR','SWIR1','SWIR2'];


// ================================
// LANDSAT 7 BAND RENAME
// (aligned to Landsat 8 structure)
// ================================
var renameL7 = function(img) {

  return img.select(
    ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'],
    bands
  );
};


// ================================
// SCALE FACTOR (C2 L2 standard)
// ================================
var scale = function(img) {

  var optical = img.select(bands)
    .multiply(0.0000275)
    .add(-0.2);

  return img.addBands(optical, null, true);
};


// ================================
// CLOUD MASK (L7 optimized)
// ================================
// NOTE: NO cirrus band in L7 → simpler + less aggressive
var maskL7 = function(img) {

  var qa = img.select('QA_PIXEL');

  var cloud = 1 << 3;
  var shadow = 1 << 4;

  var mask = qa.bitwiseAnd(cloud).eq(0)
    .and(qa.bitwiseAnd(shadow).eq(0));

  var sat = img.select('QA_RADSAT').eq(0);

  return img.updateMask(mask)
            .updateMask(sat);
};


// ================================
// INDICES (same as Landsat 8 pipeline)
// ================================
var addIndices = function(img) {

  var ndvi = img.normalizedDifference(['NIR','Red'])
    .rename('NDVI');

  var ndbi = img.normalizedDifference(['SWIR1','NIR'])
    .rename('NDBI');

  var mndwi = img.normalizedDifference(['Green','SWIR1'])
    .rename('MNDWI');

  return img.addBands([ndvi, ndbi, mndwi]);
};


// ================================
// COMPOSITE FUNCTION (L7)
// ================================
function getCompositeL7(start, end) {

  return ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')

    .filterDate(start, end)
    .filterBounds(roi)

    // SAME seasonal logic as L8 for consistency
    .filter(ee.Filter.calendarRange(11, 3, 'month'))

    .map(maskL7)
    .map(renameL7)
    .map(scale)
    .map(addIndices)

    .median()
    .clip(roi)
    .toFloat();
}


// ================================
// BUILD 1999 IMAGE
// ================================
var img2009 = getCompositeL7(
  '2008-01-01',
  '2010-12-31'
);


// ================================
// VISUALIZATION (same as L8)
// ================================
var vis = {
  bands: ['Red','Green','Blue'],
  min: 0,
  max: 0.3,
  gamma: 1.3
};

Map.addLayer(img2009, vis, '2009 Landsat 7 Composite');


// ================================
// EXPORT (fully L8-compatible)
// ================================
Export.image.toDrive({

  image: img2009,

  description: 'Osun_Landsat7_2009',

  folder: 'GEE_Exports',

  fileNamePrefix: 'Osun_L7_2009',

  region: roi,

  scale: 30,

  crs: 'EPSG:4326',

  maxPixels: 1e13
});