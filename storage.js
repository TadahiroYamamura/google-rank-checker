const fs = require('fs');

class Csv {
  constructor() {
    this.lines = [];
    this.splitter = ',';
    this.quote = '"';
    this.allowNewLine = false;
  }

  append(record) {
    this.addLine(record.keyword, record.title, record.url);
  }

  addLine(...elements) {
    this.lines.push(elements);
  }

  _normalize(lines) {
    const q = new RegExp(this.quote, 'g');
    const nl = new RegExp('(\r\n|\r|\n)', 'g');
    return lines.map(line => {
      const tmp = [];
      line.forEach(e => {
        let x = e;
        if (x == null) x = '';
        if (typeof x !== 'string') x = x.toString();
        x = x.replace(q, this.quote.repeat(2));
        if (!this.allowNewLine) x = x.replace(nl, '');
        if ([this.splitter, this.quote].some(s => x.includes(s))) {
          x = this.quote + x + this.quote;
        }
        tmp.push(x);
      });
      return tmp;
    });
  }

  save(path, callback) {
    fs.appendFile(path, this.toString(), callback);
  }

  toString() {
    return this._normalize(this.lines)
      .map(line => line.join(this.splitter))
      .join('\n');
  }
}

exports.Csv = Csv;
