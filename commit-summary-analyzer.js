var conformAsync = require('conform-async');
var _ = require('lodash');
var through2 = require('through2');
var codefeatures = require('./codefeatures');
var createExcerptRater = require('./excerptrater').create;

function createCommitSummaryAnalyzer(opts) {
  var excerptRater;

  if (opts && opts.excerptRater) {
    excerptRater = opts.excerptRater;
  }
  else {
    excerptRater = createExcerptRater();
  }

  function analyze(commitSummary, done) {
    var analysis = _.pick(commitSummary, 'sha', 'url');

    for (feature in codefeatures.identifiers) {
      var instances = findInPatches(
        commitSummary, codefeatures.identifiers[feature].regexes
      );
      if (instances.length > 0) {
        analysis[feature] = instances.map(createExcerptAnalysisWithCode);
      }
    }
    excerptRater.rateAnalysis(analysis, done);
  }

  function findInPatches(commitSummary, regexes) {
    var targets = [];
    var curriedFind = _.curry(findInPatchWithRegexes)(regexes);

    if (commitSummary.patches) {
      targets = _.flatten(_.compact(commitSummary.patches.map(curriedFind)));
    }
    return targets;
  }

  function findInPatchWithRegexes(regexes, patch) {
    function findWithRegex(found, regex) {
      return found.concat(patch.match(regex));
    }

    return _.compact(regexes.reduce(findWithRegex, []));
  }

  function createAnalysisStream(opts) {
    var analysisStream = through2(
      {
        objectMode: true
      },
      function convertToAnalysis(commitSummary, enc, callback) {
        var stream = this;

        analyze(commitSummary, function done(error, analysis) {
          if (error) {
            console.log(error);
          }
          else {
            stream.push(analysis);
          }
          callback();
        });
      }
    );

    return analysisStream;
  }

  return {
    analyze: analyze,
    createAnalysisStream: createAnalysisStream
  };
}

function createExcerptAnalysisWithCode(code) {
  return {
    code: code
  };
}

module.exports = {
  create: createCommitSummaryAnalyzer,
  createExcerptAnalysisWithCode: createExcerptAnalysisWithCode
};
