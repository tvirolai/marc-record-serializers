'use strict';

var Record = require('marc-record-js');
var util = require('util');

var fixedFieldTags = ['FMT', '001', '002','003','004','005','006','007','008','009'];

var AlephSequentialReader = function(stream) {

  var self = this,
    charbuffer = '',
    linebuffer = [],
    currentId;

  this.readable = true;
  this.count = 0;

  stream.on('data', function(data) {
 
    charbuffer += data.toString();
 
    while (1) { // eslint-disable-line no-constant-condition

      var pos = charbuffer.indexOf('\n');
      if (pos === -1) { break; }
      var raw = charbuffer.substr(0, pos);
      charbuffer = charbuffer.substr(pos+1);
      linebuffer.push(raw);
    
    }
   
    if (linebuffer.length > 0) {

      if (currentId === undefined) {
        currentId = getIdFromLine(linebuffer[0]);
      }
    
      var i=0;
      while (i < linebuffer.length) {
        if (linebuffer[i].length < 9) {
          break;
        }

        var lineId = getIdFromLine(linebuffer[i]);
        
        if (currentId !== lineId) {

          var record = linebuffer.splice(0,i);

          self.count++;

          try {
            self.emit('data', fromAlephSequential(record));
          } catch (excp) {
            self.emit('error', excp);
            break;
          }

          currentId = lineId;
          i=0;
        }
        i++;
      }
    }

  });

  stream.on('end', function(){
    if (linebuffer.length > 0) {
      self.count++;
      try {
        self.emit('data', fromAlephSequential(linebuffer));
      } catch (excp) {
        self.emit('error', excp);
        return;
      }
    }
    self.emit('end');
  });

  function getIdFromLine(line) {
    return line.split(' ')[0];
  }
};

util.inherits(AlephSequentialReader, require('stream'));

function fromAlephSequential(data) {

  var i=0;
  while (i < data.length) {

    var nextLine = data[i+1];
    if (nextLine !== undefined && isContinueFieldLine(nextLine)) {

      if (data[i].substr(-1) === '^') {
        data[i] = data[i].substr(0,data[i].length-1);
      }
      data[i] += parseContinueLineData(nextLine);
      data.splice(i+1,1);
      continue;
    }
    i++;
  }

  var record = new Record();
  record.fields = [];

  data.forEach(function(line) {
    var field = parseFieldFromLine(line);

    // Drop Aleph specific FMT fields.
    if (field.tag === 'FMT') {
      return;
    }
  
    if (field.tag === 'LDR') {
      record.leader = field.value;
    } else {
      record.fields.push(field);
    }

  });

  return record;
}

function parseContinueLineData(lineStr) {
  var field = parseFieldFromLine(lineStr);
  var firstSubfield = field.subfields[0];

  if (firstSubfield.value === '^') {
    return lineStr.substr(22);	
  }
  if (firstSubfield.value === '^^') {

    return ' ' + lineStr.substring(26, lineStr.length-1);
  }
  throw new Error('Could not parse Aleph Sequential subfield 9-continued line.');
}

function isContinueFieldLine(lineStr) {
  var field = parseFieldFromLine(lineStr);

  if (isControlfield(field)) {
    return false;
  }

  var firstSubfield = field.subfields[0];

  return (firstSubfield.code === '9' && (firstSubfield.value === '^' || firstSubfield.value === '^^'));
}

function isControlfield(field) {
  if (field.subfields === undefined) {
    return true;
  }
}

function isFixFieldTag(tag) {
  return fixedFieldTags.indexOf(tag) !== -1;
}

function parseFieldFromLine(lineStr) {
  var tag = lineStr.substr(10,3);

  if (isFixFieldTag(tag) || tag === 'LDR') {
    var data = lineStr.substr(18);
    return {tag: tag, value: data};	
  } else {
    // varfield
    var ind1 = lineStr.substr(13,1);
    var ind2 = lineStr.substr(14,1);

    var subfieldData = lineStr.substr(18);

    var subfields = subfieldData.split('$$')
      .filter(function(sf) { return sf.length !== 0; })
      .map(function(subfield) {

        var code = subfield.substr(0,1);
        var value = subfield.substr(1);
        return {code: code, value: value};
      });

    return {
      tag: tag,
      ind1: ind1,
      ind2: ind2,
      subfields: subfields
    };

  }
}

module.exports = {
  Reader: AlephSequentialReader,
  Writer: undefined,
  toAlephSequential: undefined,
  fromAlephSequential: fromAlephSequential
};