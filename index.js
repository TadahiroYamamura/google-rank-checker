const fs = require('fs');
const cli = require('cac')();
const Google = require('./google');
const { Csv } = require('./storage');

cli.command('test <...keywords>', 'コマンドテスト用')
  .option('--max <count>', '取得する最大のレコード数を指定する', { default: 10 })
  .option('--output <path>', '取得結果の出力先', { default: 'google.csv' })
  .action((keywords, options) => {
    console.log(keywords);
    console.log(options);
  });

cli.command('google [...keywords]', 'Google検索の結果を取得する')
  .option('--max <count>', '取得する最大のレコード数を指定する', { default: 10 })
  .option('--output <path>', '取得結果の出力先', { default: 'google.csv' })
  .option('--abuse-exemption <id>', 'reCAPTCHAの結果取得してきた免除ID', { default: 'google.csv' })
  .option('--keywords <file>', 'キーワードファイルのパス')
  .action((keywords, options) => {
    const google = new Google();
    google.interval = 1000;
    const storage = new Csv();
    if (options.abuseExemption != null) {
      google.cookies.push('GOOGLE_ABUSE_EXEMPTION', options.abuseExemption);
    }
    if (options.keywords != null) {
      keywords = keywords.concat(fs.readFileSync(options.keywords).toString().split('\n'));
    }
    google.on('data', records => {
      records.forEach(record => storage.append(record));
    });
    google.on('end', () => {
      storage.save(options.output, () => {});
    });
    google.on('error', err => {
      storage.save(options.output, () => {});
      console.error(err);
    });
    google.search(keywords, options.max, );
  });

cli.help();
cli.version('1.0.0');
cli.parse();
