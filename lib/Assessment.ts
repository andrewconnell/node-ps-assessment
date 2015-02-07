/// <reference path="./../typings/tsd.d.ts" />
/// <reference path="./../app.ts" />

'use strict';

var Q = require('q');
var fs = require('fs'),
    path = require('path');
var XmpMarker = require('xmp-marker');
var LineByLineReader = require('line-by-line');
import IXmpMarkerQuestion = require('./IXmpMarkerQuestion');
import IAssessmentQuestion = require('./IAssessmentQuestion');

class Assessment {

  /**
   * Collection of assessment questions.
   */
  public questions:IAssessmentQuestion[] = [];

  /**
   * Validates the lengths of the question & assessments and for the presence of exactly one correct answer.

   * @returns {string[]}      Collection of error messages. If empty, it's valid.
   */
  validate():string[] {
    var self = this,
        results = [];

    //TODO refactor hard coded value to config
    var QUESTION_MAX_LENGTH = 65,
        ANSWER_MAX_LENGTH = 65;

    // loop through all questions
    self.questions.forEach((element, index) => {
      var errorPrefix = 'Question #' + (index + 1);

      // check that question is not too long
      if (element.question.length > QUESTION_MAX_LENGTH) {
        results.push(errorPrefix + ' length (' + element.question.length + ') invalid; must be less than ' + QUESTION_MAX_LENGTH);
      }

      // check question starts with 'Q) '
      if (element.question.substr(0, 3) !== 'Q) ') {
        results.push(errorPrefix + ' does not start with \'Q) \'');
      }

      // check there are more than two answer options
      if (element.answers.length < 2) {
        results.push(errorPrefix + ' does not have more than 2 answer options');
      }

      // check there is exactly one answer
      var correctAnswers = 0;
      element.answers.forEach((element) => {
        if (element.substr(0, 1) === '*') {
          correctAnswers++;
        }
      });
      if (correctAnswers != 1) {
        results.push(errorPrefix + ' correct answers (' + correctAnswers + ') invalid; must have exactly 1')
      }

      // check each answer starts with '* ' or '- '
      var validAnswerOptions = true;
      element.answers.forEach((element) => {
        if (!((element.substr(0, 2) == '* ') || (element.substr(0, 2) == '- '))) validAnswerOptions = false;
      });
      if (!validAnswerOptions) {
        results.push(errorPrefix + ' has invalid answers; all answers must start with \'* \' or \'- \'');
      }

      // check each answer is not too long
      element.answers.forEach((element) => {
        if (element.length > ANSWER_MAX_LENGTH) {
          results.push(errorPrefix + 'invalid; an answer length (' + element.length + ') ; must be less than ' + ANSWER_MAX_LENGTH + '; ' + element);
        }
      });
    });

    return results;
  }

  /**
   * Creates the assessment questions file (either no-questions.txt or questions.txt) in the root of the module.
   *
   * @param {string}        courseId      Course ID (used in creating the clip reference).
   * @param {number}        moduleNumber  Module number (index) in he course (used in creating the clip reference).
   * @param {string}        buildPath     Fully qualified path of the directory where the assessment file will be created.
   * @returns {Q.Promise<string>}         Promise with the fully qualified path to the file created.
   */
  createAssessmentFile(courseId, moduleNumber, buildPath):Q.Promise<string> {
    var self = this;
    var deferred = Q.defer();
    var fullPath = '';

    // if no questions provided
    if (!self.questions || !self.questions.length || self.questions.length == 0) {
      fullPath = path.join(buildPath, 'no-questions.txt');
      // write empty no-questions.txt file
      Q.denodeify(fs.writeFile)(fullPath, '').then(() => {
        deferred.resolve(fullPath);
      });
    } else {
      fullPath = path.join(buildPath, 'questions.txt');

      // create a file stream
      var questionFileStream = fs.createWriteStream(fullPath);

      // write out all the questions & answers
      self.questions.forEach((question) => {
        // write question
        questionFileStream.write(question.question + '\n');

        // write answers
        question.answers.forEach((answer) => {
          questionFileStream.write(answer + '\n');
        });

        // write out clip name
        var clipFilename = courseId + '-m' + moduleNumber + '-' + question.clipNumber + '.mp4';
        questionFileStream.write('= ' + clipFilename + '\n');

        // add empty line
        questionFileStream.write('\n');
      });

      deferred.resolve(fullPath);
    }

    return deferred.promise;
  }


  /////////     PRIVATE METHODS     ///////////////////////////////


  /**
   * Creates a question & answer object from an unformatted string in marker in the Adobe XMP file.
   *
   * @param {string}   adobeXmpMarkerString   Unformatted string from the marker within the Adobe XMP file.
   * @returns {IXmpMarkerQuestion}            Object containing the question string & array of answers.
   */
  private static getQuestionFromXmpMarker(adobeXmpMarkerString:string):IXmpMarkerQuestion {
    var question = adobeXmpMarkerString.split(/\n/);

    // build array of answers
    var answers = [];
    for (var x = 1; x < question.length; x++) {
      // if not empty add answer to the array
      if (question[x].length > 0) {
        answers.push(question[x]);
      }
    }

    // return an assessment question
    return <IXmpMarkerQuestion>{
      question: question[0],
      answers:  answers
    };
  }


  /////////     STATIC METHODS     ///////////////////////////////


  /**
   * Loads all assessment questions from Adobe XMP files & returns them within an array.
   *
   * @param {string[]}      xmpFiles      Array of fully qualified paths to XMP files to process.
   * @returns {Promise<Assessment>}       Assessment object with questions.
   */
  static loadQuestionsFromXmpFiles(xmpFiles:string[]):Q.Promise<Assessment> {
    var deferred = Q.defer(),
        xmpMarker = new XmpMarker();
    var assessment = new Assessment();
    var promises = [];

    // for each XMP file, get all the markers...
    xmpFiles.forEach((xmpFile) => {
      // then get all the markers for each one
      promises.push(xmpMarker.getMarkers(xmpFile)
        .then((markers) => {
          // for each marker found in the XMP file...
          markers.forEach((marker) => {
            // convert marker content => question object with Q & A
            var questionObject = Assessment.getQuestionFromXmpMarker(marker.content);

            // if the marker is a question, then push onto the question collection
            if (questionObject && questionObject.question && questionObject.question[0] == 'Q') {
              var clipNameSplit = path.basename(xmpFile, '.xmp').split('-');

              assessment.questions.push(<IAssessmentQuestion>{
                question:   questionObject.question,
                answers:    questionObject.answers,
                clipNumber: clipNameSplit[clipNameSplit.length - 1],
                timeCode:   marker.timecode
              });
            }
          });
        }));
    });

    Q.all(promises)
      .then(() => {
        deferred.resolve(assessment);
      }).catch((error) => {
        deferred.reject(error);
      });

    return deferred.promise;
  }

  /**
   * Extracts the assessment questions from a Pluralsight meta file.
   *
   * @param {string}        questionFilePath    Fully qualified path to the assessment question file.
   * @returns {Promise<Assessment>}             Assessment object with questions.
   */
  static loadQuestionsFromMetaFile(questionFilePath:string):Q.Promise<Assessment> {
    var deferred = Q.defer();
    var assessment = new Assessment();
    var question:IAssessmentQuestion;
    var liner = new LineByLineReader(questionFilePath);

    // check each line that's read in
    liner.on('line', (line) => {
      // if question line...
      if (line.substr(0, 3) == 'Q) ') {
        // ... create new question object
        question = <IAssessmentQuestion>{
          answers: []
        };

      }

      // if answer, add to existing question
      if (line.substr(0, 2) == '* ' || line.substr(0, 2) == '- ') {
        question.answers.push(line);
      }

      // if clip, extract clip
      if (line.substr(0, 2) == '= ') {
        var clipFilenameParts = line.substr(2, line.length)
          .split('.')[0]
          .split('-');
        question.clipNumber = parseInt(clipFilenameParts[clipFilenameParts.length - 1]);

        // ... save question
        assessment.questions.push(question);
      }
    });

    // when finished reading the file
    liner.on('end', () => {
      deferred.resolve(assessment);
    });

    // when error reading the file
    liner.on('error', (error) => {
      deferred.reject(error);
    });

    return deferred.promise;
  }

}

export = Assessment;