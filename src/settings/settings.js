// @flow

import { resolve } from 'path';
import fileExists from 'file-exists';
import { readFileSync } from 'fs';
import getArguments from 'minimist';
import { argumentsToConfig } from './arguments';
import { Rule } from 'pattern-expander';
import { mergeObjects } from '../util/util';

export type Settings = {
  tasks: TasksSettings,
  download: DownloadSettings,
  elasticsearch: ElasticsearchSettings
}

export type TasksSettings = {
  download: boolean,
  elasticsearch: boolean
}

export type DownloadSettings = {
  source: string,
  output: string,
  destination: string,
  years: Rule,
  months: Rule,
  days: Rule,
  hours: Rule,
  concurrent: number,
  compression: string,
}

export type ElasticsearchSettings = {
  port: number,
  address: string,
  index: string,
  type: string,
  concurrent: number,
  batch: number
}

/**
 * Gets the application settings from the specified commandline arguments
 *
 * @access public
 *
 * @param argv {string[]} The commandline arguments.
 *
 * @return {Settings} The application settings.
 */
export function getSettings(argv: string[]): Settings {
  if (argv.length > 2 && fileExists(resolve('./', argv[2]))) {
    // read configuration from file, if an existing file is specified in the arguments
    const fileConfig = JSON.parse(readFileSync(resolve('./', argv[2])).toString());
    // parse following arguments as cli arguments
    const cliConfig = argumentsToConfig(getArguments(argv.slice(3)));

    return configToSettings(fileConfig, cliConfig);
  } else {
    // otherwise just use cli configuration
    const cliConfig = argumentsToConfig(getArguments(argv.slice(2)));

    return configToSettings(cliConfig);
  }
}
export default getSettings;

const defaultSettings: Settings = {
  tasks: {
    download: true,
    elasticsearch: true
  },
  download: {
    source: 'https://dumps.wikimedia.org/other/pageviews/bbbb/bbbb-ff/pageviews-bbbbffjj-ll0000.gz',
    output: 'bbbb-ff-jj-ll.csv',
    destination: './data',
    years: new Rule('b', 2016, 2016),
    months: new Rule('f', 1, 1),
    days: new Rule('j', 1, 31),
    hours: new Rule('l', 0, 23),
    concurrent: 3,
    compression: 'gz'
  },
  elasticsearch: {
    port: 9200,
    address: 'localhost',
    index: 'wikiviews',
    type: 'article',
    concurrent: Infinity,
    batch: 10000
  }
};

/**
 * Parses all elements from a config, into the correct format for settings, by parsing complex fields into datastructures
 * and applying defaults
 *
 * @access private
 *
 * @param config {Object} configuration, which should be converted into Settings structure
 * @param configs {[Object]} [Optional] Multiple configurations, which will be merged into the first one
 *
 * @return {Settings} The settings generated from the configuration
 */
function configToSettings(config: Object, ...configs: Object[]): Settings {
  return mergeObjects(defaultSettings, parseFields(mergeObjects(config, ...configs)));

  function parseFields(config: Object): Object {
    const result = Object.assign({}, config);

    // parse the date ranges into expansion rules
    for (const key of ['years', 'months', 'days', 'hours']) {
      if (result.download[key]) {
        result.download[key] = parseExpansionRule(result.download[key]);
      }
    }

    // parse elasticsearch.concurrent
    if (typeof result.elasticsearch.concurrent === 'string' && result.elasticsearch.concurrent === 'all') {
      result.elasticsearch.concurrent = Infinity;
    } else {
      const res = Number(result.elasticsearch.concurrent);
      if (isNaN(res)) throw new Error(`Incorrect value specified for elasticsearch.concurrent. Expected: number or 'all'. Actual: ${result.elasticsearch.concurrent}`);
      result.elasticsearch.concurrent = res;
    }

    return result;
  }

  function parseExpansionRule(stringRule: string): ?Rule {
    const match = /(\w):(\d+)-(\d+)/g.exec(stringRule);

    return (match) ? new Rule(match[1], Number(match[2]), Number(match[3])) : null;
  }
}

