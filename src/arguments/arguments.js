import getArguments from "minimist";
import * as zlib from "zlib";
import {Rule} from 'pattern-expander';

export function parseArguments(argv) {
  const cliArgs = getArguments(argv);

  const defaultArgs = {
    sourcePattern: "https://dumps.wikimedia.org/other/pagecounts-raw/2016/2016-07/pagecounts-bbbbffjj-ll0000.gz",
    destFilePattern: "bbbb-ff-jj-ll.csv",
    noDownload: undefined,
    noDB: undefined,
    destDir: "./data",
    dbPort: 9200,
    dbAddr: "127.0.0.1",
    dbIndex: "pagecounts",
    dbType: "article",
    dbBuffer: 500000,
    years: "b:2016-2016",
    months: "f:7-7",
    days: "j:1-31",
    hours: "l:0-23",
    flowControl: undefined,
    decompress: undefined
  };

  return Object.assign(defaultArgs, cliArgs);
}

export function getExpansionRules(args) {
  // parse ranges
  const years = parseExpansionRule(args.years);
  if (!years) {
    console.error(new Error("Wrong year range specified"));
    process.exit(1);
  }

  const months = parseExpansionRule(args.months);
  if (!months) {
    console.error(new Error("Wrong month range specified"))
    process.exit(1);
  }

  const days = parseExpansionRule(args.days);
  if (!days) {
    console.error(new Error("Wrong day range specified"))
    process.exit(1);
  }

  const hours = parseExpansionRule(args.hours);
  if (!hours) {
    console.error(new Error("Wrong hour range specified"))
    process.exit(1);
  }

  // setup pattern rules
  const rules = [years, months, days, hours];

  return rules;
}

function parseExpansionRule(rangeString) {
  const match = /(\w):(\d+)-(\d+)/g.exec(rangeString);

  return (match) ? new Rule(match[1], Number(match[2]), Number(match[3])) : null;
}

export function getDecompressor(args) {
  switch (args.decompress) {
    case 'gz':
      return zlib.createGunzip;
      break;
    case 'zip':
      return zlib.createUnzip;
      break;
    default:
      return () => undefined;
      break;
  }
}