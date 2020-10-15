const EventEmitter = require('events');
const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = class Google extends EventEmitter {
  constructor() {
    super();
    this.interval = 500;
  }

  choiceUserAgent() {
    const agents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:54.0) Gecko/20100101 Firefox/54.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0',
      'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0',
    ];
    const idx = Math.floor(Math.random() * agents.length);
    return agents[idx];
  }

  search(keywords, maxCount=10) {
    try {
      const buffer = [];
      for (const keyword of GoogleSearchKeyword.shuffle(keywords)) {
        // generate url
        const url = new URL('https://www.google.com/search');
        if (keyword.isGenuin() && maxCount > 10) {
          url.searchParams.append('num', maxCount);
        }
        Object.entries({ hl: 'ja', source: 'hp', biw: '', bih: '', q: keyword.toString() })
          .forEach(([key, value]) => url.searchParams.append(key, value));

        // request config
        const config = {
          headers: {
            'User-Agent': this.choiceUserAgent(),
            'Accept-Language': 'ja-JP',
            'Connection': 'Close',
          },
          transformResponse: [this.parseResult],
        };

        buffer.push([url, config, keyword]);
      }
      const timer = setInterval(() => {
        if (buffer.length !== 0) {
          const [url, config, keyword] = buffer.shift();
          console.log('query ' + keyword.toString() + '. this is ' + (keyword.isGenuin() ? 'genuin keyword.' : 'dummy keyword.'));
          axios.get(url.toString(), config).then(res => {
            if (keyword.isGenuin()) {
              res.data.forEach(r => r.keyword = keyword);
              this.emit('data', res.data);
            }
            if (buffer.length === 0) {
              clearInterval(timer);
              this.emit('end');
            }
          });
        }
      }, this.interval);
    } catch (err) {
      this.emit('error', err);
    }
  }

  parseResult(data, _headers) {
    const dom = new JSDOM(data);
    return Array.from(dom.window.document.getElementsByClassName('g'))
      .map(GoogleSerpsRecord.factory)
      .filter(item => item != null);
  }
}

class GoogleSearchKeyword {
  constructor(keyword) {
    this.keyword = keyword;
  }

  isGenuin() {
    return true;
  }

  toString() {
    return this.keyword;
  }

  static shuffle(keywords) {
    const methods = [
      GoogleSearchKeyword.generateRandomString,
      GoogleSearchKeyword.getShuffleKeyword,
    ];
    const kwObjects = keywords.map(kw => new GoogleSearchKeyword(kw));
    const dummies = keywords.map(kw => new GoogleSearchDummyKeyword(methods[Math.floor(Math.random() * methods.length)](kw)));
    const tmp = kwObjects.concat(dummies);
    tmp.sort(() => Math.random() - .5);
    return tmp;
  }

  static generateRandomString() {
    const candidates = ['wsekf', 'wlthn', 'nufxh', 'ycywg', 'lbdql', 'lphjm', 'cyuwj', 'xnrhr', 'zmbxz', 'jtozk'];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  static getShuffleKeyword(keyword) {
    if (!/\s/.test(keyword)) return GoogleSearchKeyword.generateRandomString();
    const tmp = keyword.split(/\s/g);
    tmp.sort(() => Math.random() - .5);
    tmp.shift();
    return tmp.join(' ');
  }
}

class GoogleSearchDummyKeyword extends GoogleSearchKeyword {
  constructor(keyword) {
    super(keyword);
    this.keyword = keyword;
  }

  isGenuin() {
    return false;
  }
}

class GoogleSerpsRecord {
  constructor() {
    this.keyword = '';
    this.title = '';
    this.url = '';
  }

  static factory(element) {
    if (element == null) return null;

    const organic = GoogleSerpsRecord.parseAsOrganic(element);
    if (organic != null) return organic;
    return null;
  }

  static parseAsOrganic(element) {
    const e = element.querySelector('.LC20lb');
    if (e == null) return null;
    const result = new GoogleSerpsRecord();
    result.title = e.textContent;
    result.url = new URL(e.parentElement.href);
    return result;
  }
}
