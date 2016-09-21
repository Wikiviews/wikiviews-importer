/**
 * gets the dataset date from filename if in format yyyy-mm-dd-hh
 * @access public
 *
 * @param filename {String} the filename
 *
 * @return {Date} date object (null if parsing was not successful)
 */
export function fileNameToDate(filename: string): ?Date {
  const match = /(\d{4})-(\d{2})-(\d{2})-(\d{2})/.exec(filename);

  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4])));
  } else {
    return null;
  }
}

export type Dataset = {
  article: string,
  views: number
}

/**
 * parses a wikipedia pageview dump line into an object
 * @access public
 *
 * @param line {String} line to parse
 *
 * @return {Dataset} The parsed object
 */
export function parseLine(line: string): Dataset {
    const fields = line.split(/\s/);

    return {
        article: `${fields[0]}:${fields[1]}`,
        views: Number(fields[2])
    };
}

