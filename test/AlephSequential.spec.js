/*jshint mocha:true*/
'use strict';

var chai = require('chai');
var expect = chai.expect;
var Serializers = require('../lib/index.js');
var fs = require('fs');
var path = require('path');

describe('AlephSequential', function() {

  var filesPath = path.resolve(__dirname, 'files/AlephSequential');
  var testFiles = fs.readdirSync(filesPath)
          .filter(function(fileName) { return fileName.indexOf('from') == 0; });

  testFiles.forEach(function(fromFile) {
    var toFile = fromFile.replace('from', 'to');

    it(`should convert file ${fromFile} to file ${toFile}`, function(done) {

      var fromFilePath = path.resolve(filesPath, fromFile);
      var toFilePath = path.resolve(filesPath, toFile);

      var expectedRecord = fs.readFileSync(toFilePath, 'utf8');
      var reader = new Serializers.AlephSequential.Reader(fs.createReadStream(fromFilePath));

      var parsedRecords = [];
      reader.on('data', function(record) {
        parsedRecords.push(record);
      });

      reader.on('end', function() {

        expect(parsedRecords).to.have.length(1);

        var parsedRecordAsString = parsedRecords[0].toString();
        expect(parsedRecordAsString).to.equal(expectedRecord);

        done();
      });

    });

  });

  it('should parse a record from a string representation', function(done) {
    var recordAsString = fs.readFileSync(path.resolve(filesPath, 'from1'), 'utf8')
      .split('\n')
      .filter(row => row.length > 0);
    var parsedRecord = Serializers.AlephSequential.fromAlephSequential(recordAsString);
    expect(parsedRecord.toString()).to.have.length(978);
    expect(parsedRecord).to.be.an.instanceof(Object);
    done();
  });

  it('should emit an error because of invalid data', function(done) {

    var filePath = path.resolve(__dirname, 'files/AlephSequential/erroneous');
    var reader = new Serializers.AlephSequential.Reader(fs.createReadStream(filePath));

    reader.on('error', function(err) {
      expect(err.message).to.contain('Could not parse tag from line');
      done();
    });


    reader.on('data', function() {
      done(new Error('record was read succesfully from invalid data'));
    });

  });

  it('should emit an error because the file does not exist', function(done) {

    var reader = new Serializers.AlephSequential.Reader(fs.createReadStream('foo'));

    reader.on('error', function() {
      done();
    });

    reader.on('data', function() {
      done(new Error('record was read succesfully from missing file'));
    });

  });
});
