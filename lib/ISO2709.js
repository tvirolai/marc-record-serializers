'use strict';


// adapted from the marc21parser by Henri Mäkilä <Henri.Makila@helsinki.fi>

var Record = require('marc-record-js');
var util = require('util');
var Transform = require('stream').Transform;

// Returns the entire directory starting at position 24.
// Control character '\x1E' marks the end of directory.
function parseDirectory(dataStr) {

  var currChar = '';
  var directory = '';
  var pos = 24;

  while (currChar != '\x1E') {
    currChar = dataStr.charAt(pos);
    if (currChar != 'x1E') {
      directory += currChar;
    }

    pos++;

    if (pos > dataStr.length) {
      throw new Error('Invalid record');
    }
  }
  return directory;
}

// Returns an array of 12-character directory entries.
function parseDirectoryEntries(directoryStr) {
  var directoryEntries = [];
  var pos = 0;
  var count = 0;
  while (directoryStr.length - pos >= 12) {
    directoryEntries[count] = directoryStr.substring(pos, pos + 12);
    pos += 12;
    count++;
  }
  return directoryEntries;
}
// Removes leading zeros from a numeric data field.
function trimNumericField(input) {
  while (input.length > 1 && input.charAt(0) == '0') {
    input = input.substring(1);
  }
  return input;
}

// Functions return a specified field in a single 12-character
// directory entry.
function dirFieldTag(directoryEntry) {
  return directoryEntry.substring(0, 3);
}

function dirFieldLength(directoryEntry) {
  return directoryEntry.substring(3, 7);
}

function dirStartingCharacterPosition(directoryEntry) {
  return directoryEntry.substring(7, 12);
}

// Returns a UTF-8 substring.
function utf8_substr(str, startInBytes, lengthInBytes) {
  var strBytes = stringToByteArray(str);
  var subStrBytes = [];
  var count = 0;
  for (var i = startInBytes; count < lengthInBytes; i++) {
    subStrBytes.push(strBytes[i]);
    count++;
  }
  return byteArrayToString(subStrBytes);
}
// Converts the input UTF-8 string to a byte array.
// From http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string?lq=1
function stringToByteArray(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) <= 0x7F) {
      byteArray.push(str.charCodeAt(i));
    } else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16));
      }
    }
  }
  return byteArray;
}

// Converts the byte array to a UTF-8 string.
// From http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string?lq=1
function byteArrayToString(byteArray) {
  var str = '';
  for (var i = 0; i < byteArray.length; i++) {
    str += byteArray[i] <= 0x7F ? byteArray[i] === 0x25 ? '%25' : // %
    String.fromCharCode(byteArray[i]) : '%' + byteArray[i].toString(16).toUpperCase();
  }
  return decodeURIComponent(str);
}

// Adds leading zeros to the specified numeric field.
function addLeadingZeros(numField, length) {
  while (numField.toString().length < length) {
    numField = '0' + numField.toString();
  }
  return numField;
}

// Returns the length of the input string in UTF8 bytes.
function lengthInUtf8Bytes(str) {
  var m = encodeURIComponent(str).match(/%[89ABab]/g);  
  return str.length + ( m ? m.length : 0);
}


function fromISO2709(dataStr) {

  // Parses a single data record and creates a corresponding XML structure.

  var record = {
    leader: '',
    fields: []
  };

  var leader = dataStr.substring(0, 24);

  record.leader = leader;

  // parse directory section
  var directory = parseDirectory(dataStr);
  var directoryEntries = parseDirectoryEntries(directory);

  // locate start of data fields (first occurrence of '\x1E')
  var dataStartPos = dataStr.search('\x1E') + 1;
  var dataFieldStr = dataStr.substring(dataStartPos);

  // loop through directory entries to read data fields
  var i = 0;
  for ( i = 0; i < directoryEntries.length; i++) {
    var tag = dirFieldTag(directoryEntries[i]);

    // NOTE: fieldLength is the number of UTF-8 bytes in a string
    var fieldLength = trimNumericField(dirFieldLength(directoryEntries[i]));

    var startCharPos = trimNumericField(dirStartingCharacterPosition(directoryEntries[i]));

    // append control fields for tags 00X
    if (tag.substring(0, 2) == '00') {

      var fieldElementStr = dataFieldStr.substring(startCharPos, parseInt(startCharPos, 10) + parseInt(fieldLength, 10) - 1);
  
      record.fields.push({
        tag: tag,
        value: fieldElementStr
      });
    }

    // otherwise append a data field
    else {

      var dataElementStr = utf8_substr(dataFieldStr, parseInt(startCharPos, 10), parseInt(fieldLength, 10));


      if (dataElementStr[2] != '\x1F')
        dataElementStr = dataFieldStr[startCharPos - 1] + dataElementStr;

      // parse indicators and convert '\x1F' characters to spaces
      // for valid XML output
      var ind1 = dataElementStr.charAt(0);
      if (ind1 == '\x1F')
        ind1 = ' ';
      var ind2 = dataElementStr.charAt(1);
      if (ind2 == '\x1F')
        ind2 = ' ';

      // create a <datafield> element
      
      
      var datafield = {
        tag: tag,
        ind1: ind1,
        ind2: ind2,
        subfields: []
      };


      // parse all subfields
      dataElementStr = dataElementStr.substring(2);
      // bypass indicators
      var j = 0;
      var currElementStr = '';
      for ( j = 0; j < dataElementStr.length; j++) {

        // '\x1F' begins a new subfield, '\x1E' ends all fields
        if (dataElementStr.charAt(j) == '\x1F' || dataElementStr.charAt(j) == '\x1E' || j == dataElementStr.length - 1) {

          if (currElementStr !== '') {

            if (j == dataElementStr.length - 1)
              currElementStr += dataElementStr.charAt(j);

            // parse code attribute
            var code = currElementStr.charAt(0);
            currElementStr = currElementStr.substring(1);

            // remove trailing control characters
            if (currElementStr.charAt(currElementStr.length - 1) == '\x1F' || currElementStr.charAt(currElementStr.length - 1) == '\x1E') {
              currElementStr = currElementStr.substring(0, currElementStr.length - 1);
            }

            // create a <subfield> element
            
            datafield.subfields.push({code: code, value: currElementStr});
            currElementStr = '';
          }
        } else {
          currElementStr += dataElementStr.charAt(j);
        }
      }

      record.fields.push(datafield);
    }
  }

  return new Record(record);

}


function toISO2709(record) {

  var tag, ind1, ind2;
  
  var marcStr = '';

  var leader = record.leader;
  var directoryStr = '';
  var dataFieldStr = '';
  var charPos = 0;

  record.getControlfields().forEach(function(field) {
    directoryStr += field.tag;
    if (field.value === undefined || field.value === '') {
      // special case: control field contents empty
      directoryStr += addLeadingZeros(1, 4);
      directoryStr += addLeadingZeros(charPos, 5);
      charPos++;
      dataFieldStr += '\x1E';
    } else {
      directoryStr += addLeadingZeros(field.value.length + 1, 4);
      // add character position
      directoryStr += addLeadingZeros(charPos, 5);
      // advance character position counter
      charPos += lengthInUtf8Bytes(field.value) + 1;

      dataFieldStr += field.value + '\x1E';

    }

  });

  record.getDatafields().forEach(function(field) {

    tag = field.tag;
    ind1 = field.ind1;
    ind2 = field.ind2;

    // add tag to directory
    directoryStr += tag;

    // add indicators
    dataFieldStr += ind1 + ind2 + '\x1F';

    var currDataField = '';

    field.subfields.forEach(function(subfield, i) {

      var subFieldStr = subfield.value;
      var code = subfield.code;
      subFieldStr = code + subFieldStr;

      // add terminator for subfield or data field
      if (i == field.subfields.length - 1)
        subFieldStr += '\x1E';
      else
        subFieldStr += '\x1F';

      currDataField += subFieldStr;

    });

    dataFieldStr += currDataField;

    // add length of field containing indicators and a terminator
    // (3 characters total)

    //directoryStr += addLeadingZeros(lengthInUtf8Bytes(currDataField) + 3, 4);
    //directoryStr += addLeadingZeros(currDataField.length + 3, 4);
    directoryStr += addLeadingZeros(stringToByteArray(currDataField).length + 3, 4);

    // add character position
    directoryStr += addLeadingZeros(charPos, 5);
    // advance character position counter
    charPos += lengthInUtf8Bytes(currDataField) + 3;
  
  });

  // recalculate and write new string length into leader
  var newStrLength = stringToByteArray(leader + directoryStr + '\x1E' + dataFieldStr + '\x1D').length;
  leader = addLeadingZeros(newStrLength, 5) + leader.substring(5);
  
  // recalculate base address position
  var newBaseAddrPos = 24 + directoryStr.length + 1;
  leader = leader.substring(0, 12) + addLeadingZeros(newBaseAddrPos, 5) + leader.substring(17);
  
  marcStr += leader + directoryStr + '\x1E' + dataFieldStr + '\x1D';
  
  return marcStr;
    
}

util.inherits(ISO2709ParseStream, Transform);
function ISO2709ParseStream(options) {
  options = options || {};
  options.objectMode = true;

  Transform.call(this, options);

  this.charbuffer = '';
}

ISO2709ParseStream.prototype._transform = function(chunk, encoding, done) {
  
  if (chunk === null) {
    return;
  }

  this.charbuffer += chunk;
  
  while (1) { // eslint-disable-line no-constant-condition
    var pos = this.charbuffer.indexOf('\x1D');
    if (pos === -1) { 
      break;
    }

    var raw = this.charbuffer.substr(0, pos);
    this.charbuffer = this.charbuffer.substr(pos+1);

    try {
      this.push(fromISO2709(raw));
    } catch (excp) {
      this.emit('error', excp);
    }
  }

  done();
};



util.inherits(ISO2709EncodeStream, Transform);

function ISO2709EncodeStream(options) {
  options = options || {};
  options.readableObjectMode = false;
  options.writableObjectMode = true;

  Transform.call(this, options);

}
ISO2709EncodeStream.prototype._transform = function(chunk, encoding, done) {

  try {
    this.push(toISO2709(chunk));
  } catch (excp) {
    this.emit('error', excp);
  }

  done();
};

module.exports = {
  toISO2709: toISO2709,
  fromISO2709: fromISO2709,
  ParseStream: ISO2709ParseStream,
  EncodeStream: ISO2709EncodeStream
};
