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

    const result = {
        project: fields[0],
        pages: [
            {
                name: fields[1],
                counts: [{
                    date: date,
                    count: fields[2]
                }]
            }
        ]
    };

    return Promise.resolve(result);
}
