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

var fillGaps = function(image){
  var filled1 = image.focal_mean(1, 'square', 'pixels', 5)
  var filled2 = filled1.focal_mean(1, 'square', 'pixels', 5)
  var filled3 = filled2.focal_mean(1, 'square', 'pixels', 5)
  
  var filled = image.unmask(filled1).unmask(filled2).unmask(filled3);
  
  return filled;
}
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
  .filter(ee.Filter.lt('CLOUD_COVER', 10))

    .filterDate(start, end)
    .filterBounds(roi)
    
    .map(maskL7)
    .map(renameL7)
    .map(scale)
    .map(function(img){
        return fillGaps(img.select(bands))
          .copyProperties(img, img.propertyNames());
    })
    .map(addIndices)

    .median()
    .clip(roi)
    .toFloat();
}


// ================================
// BUILD 2009 IMAGE
// ================================
var img2009 = getCompositeL7(
  '2009-01-01',
  '2009-12-31'
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
Map.addLayer(img2009.select('NDVI'), {
  min: -0.2,
  max: 0.8,
  palette: [
    'brown',   // bare soil / built-up (low NDVI)
    'yellow',
    'lightgreen',
    'green',   // healthy vegetation
    'darkgreen'
  ]
}, 'NDVI')



var training = ee.FeatureCollection('projects/ornate-lead-196416/assets/training_2009');


var label = 'Class';
var bands = ['Blue', 'Green', 'Red', 'NIR',
              'SWIR1', 'NDVI', 'MNDWI', 'NDBI']; 
var input = img2009.select(bands);
print(img2009)

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
  }, 'Land Cover 2009'); 


var validation = testSet.classify(classifier);

var testAccuracy = validation.errorMatrix(label, 'classification');

print('Confusion Matrix:', testAccuracy);
print('Overall Accuracy:', testAccuracy.accuracy());
print('Kappa:', testAccuracy.kappa());


/*
Confusion Matrix:
List (5 elements)
0: [27,1,0,2,0]
1: [1,31,1,0,0]
2: [0,1,9,0,0]
3: [2,0,0,12,1]
4: [0,1,1,1,7]

Overall Accuracy:
0.8775510204081632

Kappa:
0.8359146086228547

*/