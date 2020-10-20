const Google = require('./google');
const { Json } = require('./storage');

exports.handler = function(event, _context, callback) {
  let kw = event.keyword;
  if (kw == null) return callback(new Error('keyword not defined'), null);

  if (typeof kw === 'string') {
    if (!kw.trim()) return callback(new Error('keyword cannot be empty'), null);
    kw = [kw.trim()];
  } else if (Array.isArray(kw)) {
    kw = kw.map(x => x.trim()).filter(x => !!x);
    if (kw.length === 0) return callback(new Error('keyword cannot be empty'), null);
  } else {
    return callback(new Error('keyword should be a array or string'), null);
  }

  const google = new Google();
  const storage = new Json();
  google.on('data', records => {
    records.forEach(record => storage.append(record));
  });
  google.on('end', () => {
    callback(null, storage.data)
  });
  google.on('error', err => {
    callback(err, null);
  });
  google.search(kw, 100);
}
