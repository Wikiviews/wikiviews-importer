import dateformat from "dateformat";

/**
 * parses a wikipedia pagecount line into an object
 * @access public
 * 
 * @param line {String} line to parse
 * @param date {Date} regarding date
 *
 * @return {Promise} Promise which is resolved with the parsed object
 */
export default function parseLine(line, date) {
    const fields = line.split(/\s/);
    const dateString = dateformat(date, "yyyy-mm-d-HH");

    const result = {
        article: `${fields[0]}:${fields[1]}`,
        [dateString]: fields[2]
    };

    return Promise.resolve(result);
}
