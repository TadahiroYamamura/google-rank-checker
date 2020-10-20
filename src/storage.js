const fs = require('fs');

exports.Csv = class Csv {
  constructor() {
    this.data = [];
    this.splitter = ',';
    this.quote = '"';
    this.allowNewLine = false;
    Object.defineProperty(this, 'reg_quote', {get: () => new RegExp(this.quote, 'g')});
    Object.defineProperty(this, 'reg_newline', {get: () => new RegExp('(\r\n|\r|\n)', 'g')});
  }

  append(record) {
    this.data.push(record);
  }

  _normalize(record) {
    return [
      record.rank,
      record.keyword,
      record.title,
      record.url,
    ].map(e => {
      if (e == null) e = '';
      if (typeof e !== 'string') e = e.toString();
      e = e.replace(this.reg_quote, this.quote.repeat(2));
      if (!this.allowNewLine) e = e.replace(this.reg_newline, '');
      if ([this.splitter, this.quote].some(s => e.includes(s))) {
        e = this.quote + e + this.quote;
      }
      return e;
    });
  }

  save(path, callback) {
    fs.appendFile(path, this.toString(), callback);
  }

  toString() {
    return this.data
      .map(x => this._normalize(x).join(this.splitter))
      .join('\n');
  }
}

exports.Json = class Json {
  constructor() {
    this.data = [];
  }

  append(record) {
    this.data.push(record);
  }

  save(path, callback) {
    fs.appendFile(path, this.toString(), callback);
  }

  toString() {
    return JSON.stringify(this.data, undefined, 2);
  }
}
