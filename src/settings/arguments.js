// @flow

/**
 * Converts parsed command line arguments into the config file structure
 *
 * @access public
 *
 * @param args {Object} map of provided command line arguments
 *
 * @return {Object} arguments in config file structure
 */
export function argumentsToConfig(args: Object): Object {
  let result = {
    tasks: {},
    download: {},
    elasticsearch: {}
  };

  // map command line arguments to result structure
  if (args.download) {
    if (args.download == 'false') {
      result.tasks.download = false;
    } else {
      result.tasks.download = true;
    }
  }

  if (args.elasticsearch) {
    if (args.elasticsearch == 'false') {
      result.tasks.elasticsearch = false;
    } else {
      result.tasks.elasticsearch = true;
    }
  }

  if (args.source) {
    result.download.source = args.source;
  }

  if (args.output) {
    result.download.output = args.output;
  }

  if (args.destination) {
    result.download.destination = args.destination;
  }

  if (args.years) {
    result.download.years = args.years;
  }

  if (args.months) {
    result.download.months = args.months;
  }

  if (args.days) {
    result.download.days = args.days;
  }

  if (args.hours) {
    result.download.hours = args.hours;
  }

  if (args.concurrentDownloads) {
    result.download.concurrent = Number(args.concurrentDownloads);
  }

  if (args.sourceCompression) {
    result.download.compression = args.sourceCompression;
  }

  if (args.esPort) {
    result.elasticsearch.port = Number(args.esPort);
  }

  if (args.esAddr) {
    result.elasticsearch.address = args.esAddr;
  }

  if (args.esIndex) {
    result.elasticsearch.index = args.esIndex;
  }

  if (args.esType) {
    result.elasticsearch.type = args.esType;
  }

  if (args.concurrentInsertions) {
    result.elasticsearch.concurrent = args.concurrentInsertions;
  }

  if (args.batchInsert) {
    result.elasticsearch.batch = args.batchInsert;
  }

  return result;
}
export default argumentsToConfig;