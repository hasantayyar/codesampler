var probable = require('probable');
var _ = require('lodash');
var conformAsync = require('conform-async');
var featureProbabilities = require('./codefeatures').featureProbabilities;

function createExcerptPicker(opts) {
  var createRangeTableFromDict = probable.createRangeTableFromDict;
  var pickFromArray = probable.pickFromArray;
  var excerptFilter;

  if (opts) {
    if (opts.createRangeTableFromDict) {
      createRangeTableFromDict = opts.createRangeTableFromDict;
    }
    if (opts.excerptFilter) {
      excerptFilter = opts.excerptFilter;
    }
    if (opts.pickFromArray) {
      pickFromArray = opts.pickFromArray;
    }
  }

  function getCodeFromExcerpt(excerpt) {
    return excerpt.code;
  }

  function makeSelection(choices, chosenExcerptType) {
    var choice = pickFromArray(choices);
    if (choice) {
      choice.featureType = chosenExcerptType;
    }
    return choice;
  }
  
  return function pickExcerptFromAnalysis(analysis, done) {
    var presentFeatures = _.intersection(
      Object.keys(analysis), Object.keys(featureProbabilities)
    );

    if (presentFeatures.length < 1) {
      conformAsync.callBackOnNextTick(done, null, null);
      return;
    }

    var featureTable = createRangeTableFromDict(
      _.pick.apply(_, [featureProbabilities].concat(presentFeatures))
    );

    var chosenExcerptType = featureTable.roll();
    var excerpts = analysis[chosenExcerptType];
    var choices = _.uniq(excerpts, false, getCodeFromExcerpt);

    var choice;
    
    if (excerptFilter) {
      excerptFilter(choices, function pickFromFiltered(error, filteredChoices) {
        if (error) {
          done(error);
        }
        else {
          done(null, makeSelection(filteredChoices, chosenExcerptType));
        }
      });
    }
    else {
      conformAsync.callBackOnNextTick(
        done, null, makeSelection(choices, chosenExcerptType)
      );
    }
  }
}

module.exports = {
  create: createExcerptPicker
};
