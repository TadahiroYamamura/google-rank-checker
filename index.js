const fs = require('fs');
const cli = require('cac')();
const Google = require('./google');

cli.command('test <...keywords>', 'コマンドテスト用')
  .option('--max <count>', '取得する最大のレコード数を指定する', { default: 10 })
  .option('--output <path>', '取得結果の出力先', { default: 'google.csv' })
  .action((keywords, options) => {
    console.log(keywords);
    console.log(options);
  });

cli.command('google <...keywords>', 'Google検索の結果を取得する')
  .option('--max <count>', '取得する最大のレコード数を指定する', { default: 10 })
  .option('--output <path>', '取得結果の出力先', { default: 'google.csv' })
  .action((keywords, options) => {
    const google = new Google();
    google.on('data', records => {
      const data = records.map(r =>
        '"' +
        [
          r.keyword,
          r.title.replace(/"/g, '""'),
          r.url.toString()
        ].join('","') +
        '"'
      ).join('\n');
      fs.appendFile(options.output, data, () => {});
    });
    google.on('error', err => {
      console.error(err);
    });
    google.search(keywords, options.max);
  });

cli.help();
cli.version('1.0.0');
cli.parse();
