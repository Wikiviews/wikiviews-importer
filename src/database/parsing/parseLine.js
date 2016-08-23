import dateformat from "dateformat";

/**
 * parses a wikipedia pagecount line into an object
 * @access public
 * 
 * @param line {String} line to parse
 * @param date {Date} regarding date
 *
 * @return {Object} The parsed object
 */
export default function parseLine(line, date) {
    const fields = line.split(/\s/);
    const dateString = dateformat(date, "yyyy-mm-dd-HH");

    return {
        article: `${fields[0]}:${fields[1]}`,
        date: date,
        count: fields[2]
    };
}
