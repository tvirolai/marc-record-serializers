'use strict';

var Record = require('marc-record-js');
var xmldom = require('xmldom');
var parser = new xmldom.DOMParser();
var serializer = new xmldom.XMLSerializer();
var xmldoc =  new xmldom.DOMImplementation().createDocument();

var NODE_TYPE = {
  TEXT_NODE: 3
};

function fromOAI_MARCXML(xmlString) {

  var record = new Record();
  
  var doc = parser.parseFromString(xmlString);

  var recordNode = doc.getElementsByTagName('oai_marc')[0];

  var childNodes = (recordNode !== undefined) ?  Array.prototype.slice.call(recordNode.childNodes) : [];

  childNodes.filter(notTextNode).forEach(function(node) {
  
    switch (node.tagName) {
      case 'fixfield': handleControlfieldNode(node); break;
      case 'varfield': handleDatafieldNode(node); break;
      default: throw new Error('Unable to parse node: ' + node.tagName); 
    }

    function handleControlfieldNode(node) {
      var tag = node.getAttribute('id');
      if (node.childNodes[0] !== undefined && node.childNodes[0].nodeType === NODE_TYPE.TEXT_NODE) {
        var value = node.childNodes[0].data;
        if (tag === 'LDR') {
          record.leader = value;
        } else {
          record.appendControlField([tag, value]);
        }    
      } else {
        throw new Error('Unable to parse controlfield: ' + tag);
      }
    }

    function handleDatafieldNode(node) {
      var tag = node.getAttribute('id');
      var ind1 = node.getAttribute('i1');
      var ind2 = node.getAttribute('i2');

      var subfields = Array.prototype.slice.call(node.childNodes).filter(notTextNode).map(function(subfieldNode) {

        var code = subfieldNode.getAttribute('label');
        var text = getChildTextNodeContents(subfieldNode).join('');

        return {
          code: code,
          value: text
        };
      });

      record.appendField({
        tag: tag,
        ind1: ind1,
        ind2: ind2,
        subfields: subfields
      });

    }

    function getChildTextNodeContents(node) {
      var childNodes = Array.prototype.slice.call(node.childNodes);
      var textNodes = childNodes.filter(function(node) {
        return node.nodeType === NODE_TYPE.TEXT_NODE;
      });
      return textNodes.map(function(node) {
        return node.data;
      });
    }

  });

  return record;
}

function notTextNode(node) {
  return node.nodeType !== NODE_TYPE.TEXT_NODE;
}

function toOAI_MARCXML(record) {

  var xmlRecord = mkElement('oai_marc');

  xmlRecord.appendChild(mkControlfield('LDR', record.leader));

  record.getControlfields().forEach(function(field) {
    xmlRecord.appendChild(mkControlfield(field.tag, field.value));
  });

  record.getDatafields().forEach(function(field) {
    xmlRecord.appendChild(mkDatafield(field));
  });

  return serializer.serializeToString(xmlRecord);
}

function mkDatafield(field) {
  var datafield = mkElement('varfield');
  datafield.setAttribute('id', field.tag);
  datafield.setAttribute('i1', formatIndicator(field.ind1));
  datafield.setAttribute('i2', formatIndicator(field.ind2));

  field.subfields.forEach(function(subfield) {
    var sub = mkElementValue('subfield', subfield.value);
    sub.setAttribute('label', subfield.code);

    datafield.appendChild(sub);
  });

  return datafield;
}

function formatIndicator(ind) {
  return ind == '_' ? ' ' : ind;
}

function mkElementValue(name, value) {
  var el = mkElement(name);
  var t = xmldoc.createTextNode(value);
  el.appendChild(t);
  return el;
}
function mkElement(name) {
  return xmldoc.createElement(name);
}

function mkControlfield(tag, value) {
  var cf = mkElement('fixfield');
  cf.setAttribute('id', tag);
  var t = xmldoc.createTextNode(value);
  cf.appendChild(t);
  return cf;
}

module.exports = {
  fromOAI_MARCXML: fromOAI_MARCXML,
  toOAI_MARCXML: toOAI_MARCXML
};
