/**
 * gets the dataset date from filename if in format yyyy-mm-dd-hh
 * @access public
 *
 * @param filename {String} the filename
 *
 * @return {Date} date object (false if parsing was not successful)
 */
export default function parseFileName(filename) {
    const match = /(\d{4})-(\d{2})-(\d{2})-(\d{2})/.exec(filename);

    if (match) {
        return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4])));
    } else {
        return false;
    }
}

