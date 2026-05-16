// ======================================================
// REUSABLE UNSUPERVISED LULC CLASSIFICATION
// TRAIN ON 1984, APPLY TO 2009
// ======================================================

// ======================================================
// USER SETTINGS
// ======================================================
var stateName = 'Osun';
var bufferDistance = 10000;
var targetYear = '2009';

// Supported target years:
// 1984, 1999, 2004, 2009, 2014, 2019, 2024
// Skipped for now:
// 1987_1991_error.js, 1991_1997_error.js


// ======================================================
// NIGERIA ADM1
// ======================================================
var states = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Nigeria'));

var state = states.filter(
  ee.Filter.eq('ADM1_NAME', stateName)
);

var roi = state.geometry().buffer(bufferDistance);


// ======================================================
// DISPLAY ROI
// ======================================================
Map.centerObject(roi, 8);

Map.addLayer(
  roi,
  {color: 'blue'},
  stateName + ' Buffered ROI'
);


// ======================================================
// CONFIGURATION
// ======================================================
var classificationBands = [
  'Blue',
  'Green',
  'Red',
  'NIR',
  'SWIR1',
  'SWIR2',
  'NDVI',
  'NDBI',
  'MNDWI'
];

var reflectanceBands = [
  'Blue',
  'Green',
  'Red',
  'NIR',
  'SWIR1',
  'SWIR2'
];

var nClusters = 10;
var sampleSize = 5000;
var sampleSeed = 42;

var yearConfigs = {
  '1984': {
    label: '1984',
    sensorKey: 'L5',
    start: '1984-01-01',
    end: '1986-12-31',
    useSeasonFilter: true
  },
  '1999': {
    label: '1999',
    sensorKey: 'L5',
    start: '1998-01-01',
    end: '2000-12-31',
    useSeasonFilter: false
  },
  '2004': {
    label: '2004',
    sensorKey: 'L7',
    start: '2003-01-01',
    end: '2005-12-31',
    useSeasonFilter: true
  },
  '2009': {
    label: '2009',
    sensorKey: 'L7',
    start: '2008-01-01',
    end: '2010-12-31',
    useSeasonFilter: true
  },
  '2014': {
    label: '2014',
    sensorKey: 'L8',
    start: '2013-01-01',
    end: '2015-12-31',
    useSeasonFilter: true
  },
  '2019': {
    label: '2019',
    sensorKey: 'L8',
    start: '2018-01-01',
    end: '2020-12-31',
    useSeasonFilter: true
  },
  '2024': {
    label: '2024',
    sensorKey: 'L8',
    start: '2022-01-01',
    end: '2024-12-31',
    useSeasonFilter: true
  }
};

var targetConfig = yearConfigs[targetYear];

if (!targetConfig) {
  throw new Error(
    'Unsupported targetYear: ' + targetYear +
    '. Use one of 1984, 1999, 2004, 2009, 2014, 2019, 2024.'
  );
}


// ======================================================
// SENSOR HELPERS
// ======================================================
var renameL5 = function(img) {
  return img.select(
    ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'],
    reflectanceBands
  );
};

var renameL7 = function(img) {
  return img.select(
    ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'],
    reflectanceBands
  );
};

var renameL8 = function(img) {
  return img.select(
    ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
    reflectanceBands
  );
};

var scaleReflectance = function(img) {
  var optical = img.select(reflectanceBands)
    .multiply(0.0000275)
    .add(-0.2);

  return img.addBands(optical, null, true);
};

var maskCloudsL5L8 = function(img) {
  var qa = img.select('QA_PIXEL');

  var mask = qa.bitwiseAnd(1 << 1).eq(0)
    .and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0));

  var satMask = img.select('QA_RADSAT').eq(0);

  return img.updateMask(mask)
    .updateMask(satMask);
};

var maskCloudsL7 = function(img) {
  var qa = img.select('QA_PIXEL');

  var cloud = 1 << 3;
  var shadow = 1 << 4;

  var mask = qa.bitwiseAnd(cloud).eq(0)
    .and(qa.bitwiseAnd(shadow).eq(0));

  var satMask = img.select('QA_RADSAT').eq(0);

  return img.updateMask(mask)
    .updateMask(satMask);
};

var addIndices = function(img) {
  var ndvi = img.normalizedDifference(['NIR', 'Red'])
    .rename('NDVI')
    .toFloat();

  var ndbi = img.normalizedDifference(['SWIR1', 'NIR'])
    .rename('NDBI')
    .toFloat();

  var mndwi = img.normalizedDifference(['Green', 'SWIR1'])
    .rename('MNDWI')
    .toFloat();

  return img.addBands([ndvi, ndbi, mndwi]);
};

var sensorSettings = {
  'L5': {
    collection: 'LANDSAT/LT05/C02/T1_L2',
    rename: renameL5,
    mask: maskCloudsL5L8
  },
  'L7': {
    collection: 'LANDSAT/LE07/C02/T1_L2',
    rename: renameL7,
    mask: maskCloudsL7
  },
  'L8': {
    collection: 'LANDSAT/LC08/C02/T1_L2',
    rename: renameL8,
    mask: maskCloudsL5L8
  }
};


// ======================================================
// COMPOSITE BUILDER
// ======================================================
function buildComposite(config) {
  var sensor = sensorSettings[config.sensorKey];

  var collection = ee.ImageCollection(sensor.collection)
    .filterDate(config.start, config.end)
    .filterBounds(roi);

  if (config.useSeasonFilter) {
    collection = collection.filter(
      ee.Filter.calendarRange(11, 3, 'month')
    );
  }

  return collection
    .map(sensor.mask)
    .map(sensor.rename)
    .map(scaleReflectance)
    .map(addIndices)
    .median()
    .clip(roi)
    .toFloat();
}


// ======================================================
// STANDARDIZATION USING 1984 TRAINING STATS
// ======================================================
function getBandStats(image, bands) {
  return image.select(bands).reduceRegion({
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.stdDev(),
      sharedInputs: true
    }),
    geometry: roi,
    scale: 30,
    maxPixels: 1e13
  });
}

function standardizeWithStats(image, bands, stats) {
  var standardized = ee.ImageCollection(
    bands.map(function(band) {
      var mean = ee.Number(stats.get(band + '_mean'));
      var std = ee.Number(stats.get(band + '_stdDev')).max(1e-6);

      return image.select(band)
        .subtract(mean)
        .divide(std)
        .rename(band)
        .toFloat();
    })
  ).toBands();

  return standardized.rename(bands);
}


// ======================================================
// TRAIN ON 1984
// ======================================================
var trainingConfig = yearConfigs['1984'];
var trainingComposite = buildComposite(trainingConfig);
var trainingInput = trainingComposite.select(classificationBands);
var trainingStats = getBandStats(trainingInput, classificationBands);
var standardizedTraining = standardizeWithStats(
  trainingInput,
  classificationBands,
  trainingStats
);

var trainingSamples = standardizedTraining.sample({
  region: roi,
  scale: 30,
  numPixels: sampleSize,
  seed: sampleSeed,
  geometries: false
});

var clusterer = ee.Clusterer.wekaKMeans(nClusters)
  .train(trainingSamples);


// ======================================================
// APPLY 1984 TRAINER TO TARGET YEAR
// ======================================================
var targetComposite = buildComposite(targetConfig);
var targetInput = targetComposite.select(classificationBands);
var standardizedTarget = standardizeWithStats(
  targetInput,
  classificationBands,
  trainingStats
);

var classified = standardizedTarget.cluster(clusterer);

var lulc = classified.remap(
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [2, 2, 3, 1, 4, 2, 5, 3, 4, 1]
);

var smooth = lulc.focal_mode({
  radius: 1,
  units: 'pixels'
});


// ======================================================
// VISUALIZATION
// ======================================================
var compositeVis = {
  bands: ['Red', 'Green', 'Blue'],
  min: 0,
  max: 0.3,
  gamma: 1.3
};

var lulcPalette = [
  '0000FF',
  '008000',
  'FF0000',
  'D2B48C',
  '00FFFF'
];

Map.addLayer(
  targetComposite,
  compositeVis,
  targetYear + ' Composite'
);

Map.addLayer(
  classified.randomVisualizer(),
  {},
  targetYear + ' Raw Clusters'
);

Map.addLayer(
  smooth,
  {
    min: 1,
    max: 5,
    palette: lulcPalette
  },
  targetYear + ' Final LULC'
);


// ======================================================
// DIAGNOSTICS
// ======================================================
print('State', stateName);
print('Target year', targetYear);
print('1984 training config', trainingConfig);
print('Target config', targetConfig);
print('1984 training standardization stats', trainingStats);

print(
  targetYear + ' Cluster Frequency',
  classified.reduceRegion({
    reducer: ee.Reducer.frequencyHistogram(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e13
  })
);

var areaImage = ee.Image.pixelArea().addBands(smooth);

var areaStats = areaImage.reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'class'
  }),
  geometry: roi,
  scale: 30,
  maxPixels: 1e13
});

print(targetYear + ' Area Statistics', areaStats);

var classNames = {
  1: 'Water',
  2: 'Vegetation',
  3: 'Built-up',
  4: 'Bare Land',
  5: 'Wetland'
};

print('Class Names', classNames);


// ======================================================
// EXPORTS
// ======================================================
Export.image.toDrive({
  image: smooth,
  description: stateName + '_' + targetYear + '_LULC',
  folder: 'GEE_LULC',
  fileNamePrefix: stateName + '_' + targetYear + '_LULC',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: classified,
  description: stateName + '_' + targetYear + '_Clusters',
  folder: 'GEE_LULC',
  fileNamePrefix: stateName + '_' + targetYear + '_Clusters',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});