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
var bufferDistance = 2000;


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

    .filter(
  ee.Filter.or(
    ee.Filter.calendarRange(11, 12, 'month'),
    ee.Filter.calendarRange(1, 3, 'month')
  )
)

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
  '2024-01-01',
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

var training = ee.FeatureCollection('projects/ornate-lead-196416/assets/training_2024');


var label = 'Class';
var bands = ['Blue', 'Green', 'Red', 'NIR',
              'SWIR1', 'NDVI', 'MNDWI', 'NDBI']; 
var input = img2024.select(bands);
print(img2024)

//Sample regions to create training data and test dataset

var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30,
  tileScale: 4
});
print(trainImage);
 
var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan('random', 0.8));  // Training data
var testSet = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));  // Validation data

//Classification Model
var classifier = ee.Classifier.smileCart().train(trainSet, label, bands);

//Image Classification
var classified = input.classify(classifier);

//Classification results

Map.addLayer(classified, {
  palette: ['blue', 'red', 'green', 'lightgreen', 'yellow'],
  min: 0, max:4
  }, 'Land Cover 2024'); 



  /*
List (5 elements)
0: [17,1,1,0,0]
1: [2,21,0,1,1]
2: [0,0,4,0,1]
3: [0,0,1,3,1]
4: [0,2,3,0,3]
Overall Accuracy:
0.8227848101265823
Kappa:
0.7620993762099377



  */