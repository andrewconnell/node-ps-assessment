/// <reference path="./../typings/tsd.d.ts" />
/// <reference path="./../app.ts" />

'use strict';

var Q = require('Q'),
    os = require('os'),
    fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf');
var glob = require('glob');
var chai = require('chai'),
    expect = chai.expect;
import Assessment = require('./../lib/assessment');
import IAssessmentQuestion = require('./../lib/IAssessmentQuestion');

describe('Assessment', () => {

  var assessment:Assessment;
  var sourcePath = path.join(__dirname, 'fixtures');

  before((done) => {
    assessment = new Assessment();

    done();
  });

  describe('loadQuestionsFromXmpFiles()', () => {

    it('will build question array from XMP clip files in assessment object', (done) => {
      // get a list of all XMP files
      var xmpFileQuery = path.join(sourcePath, 'xmp-clip-metadata') + '/*.xmp';
      Q.denodeify(glob)(xmpFileQuery, null)
        .then((xmpFiles) => {
          return Assessment.loadQuestionsFromXmpFiles(xmpFiles);
        }).then((assessment) => {
          // make sure 5 questions came back
          expect(assessment.questions.length).to.equal(5);

          // make sure the values are good in each question
          assessment.questions.forEach((q) => {
            expect(q.question).to.exist;
            expect(q.answers).to.exist;
            expect(q.answers.length).to.be.greaterThan(1);
            expect(q.clipNumber).to.exist;
            expect(q.timeCode).to.exist;
          });

          done();
        }).catch((error) => {
          expect(error).to.be.undefined;
          done();
        });
    });

  });

  describe('loadQuestionsFromMetaFile()', () => {

    it('will build question array from meta file', (done) => {
      var pathToMetaFile = path.join(sourcePath, 'questions.txt');
      Assessment.loadQuestionsFromMetaFile(pathToMetaFile)
        .then((assessment) => {
          // make sure 4 questions came back
          expect(assessment.questions.length).to.equal(4);
          done();
        }).catch((error) => {
          expect(error).to.be.undefined;
          done();
        });
    });

  });

  describe('createAssessmentFile()', () => {
    var courseId = 'foo-fundamentals',
        tempBuildPath = '';

    before((done) => {
      tempBuildPath = path.join(os.tmpdir(), 'node-ps-assessment');
      fs.mkdirSync(tempBuildPath);

      done();
    });

    after((done) => {
      rimraf.sync(tempBuildPath);

      done();
    });

    it('will create questions.txt for assessment questions', (done) => {
      assessment.questions.push(<IAssessmentQuestion>{
        question:   'Q) Question number 1',
        answers:    ['- answer 1', '- answer 2', '* answer 3'],
        clipNumber: 1,
        timeCode:   '12:34'
      });
      assessment.questions.push(<IAssessmentQuestion>{
        question:   'Q) Question number 2',
        answers:    ['- answer 4', '- answer 5', '* answer 6'],
        clipNumber: 1,
        timeCode:   '34:56'
      });

      assessment.createAssessmentFile(courseId, 1, tempBuildPath)
        .then((filePath) => {
          // check if metadata file present
          expect(fs.existsSync(filePath)).to.be.true;

          // validate the path & file present
          expect(filePath).to.be.a.path;
          expect(filePath).to.be.a.file;

          //todo: check for validity of file contents
        })
        .then(() => {
          done();
        })
        .catch((error) => {
          expect(error).to.be.undefined;
          done();
        });
    });

    it('will create zero byte no-questions.txt when no assessment questions', (done) => {
      assessment.createAssessmentFile(courseId, 1, tempBuildPath)
        .then((filePath) => {
          // check if metadata file present
          expect(fs.existsSync(filePath)).to.be.true;

          // validate the path & file present
          expect(filePath).to.be.a.path;
          expect(filePath).to.be.a.file;

          //todo: check for validity of file contents
        })
        .then(() => {
          done();
        })
        .catch((error) => {
          expect(error).to.be.undefined;
          done();
        });
    });

  });

  describe('validate()', () => {
    beforeEach((done) => {
      assessment = new Assessment();

      done();
    });

    it('will report when question title is too long', (done) => {
      assessment.questions.push(<IAssessmentQuestion>{
        question:   'Q) Question number 123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
        answers:    ['- answer 1', '- answer 2', '* answer 3'],
        clipNumber: 1,
        timeCode:   '12:34'
      });

      var results = assessment.validate();

      expect(results.length).to.equal(1);

      done();
    });

    it('will report when an answer is too long', (done) => {
      assessment.questions.push(<IAssessmentQuestion>{
        question:   'Q) Question number 1',
        answers:    ['- answer 1', '- answer 2', '* answer 323456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'],
        clipNumber: 1,
        timeCode:   '12:34'
      });

      var results = assessment.validate();

      expect(results.length).to.equal(1);

      done();
    });

    it('will report when there are no correct answers', (done) => {
      assessment.questions.push(<IAssessmentQuestion>{
        question:   'Q) Question number 1',
        answers:    ['- answer 1', '- answer 2', '- answer 3'],
        clipNumber: 1,
        timeCode:   '12:34'
      });

      var results = assessment.validate();

      expect(results.length).to.equal(1);

      done();
    });

    it('will report when there are multiple correct answers', (done) => {
      assessment.questions.push(<IAssessmentQuestion>{
        question:   'Q) Question number 1',
        answers:    ['* answer 1', '- answer 2', '* answer 3'],
        clipNumber: 1,
        timeCode:   '12:34'
      });

      var results = assessment.validate();

      expect(results.length).to.equal(1);

      done();
    });
  });

});
