import {createInterface} from "readline";
import {createReadStream} from "fs";

/**
 * adds the wikipedia pageview data in the specified file into the passed db connection
 * @access public
 *
 * @param file {String} filepath of the source file
 * @param db {Collection} mongodb collection object
 *
 * @return {Promise} Promise which is resolved with true and rejected with errors while inserting into db
 */
export default function dbadd(file, db) {
    if (!file) return Promise.reject(new Error("No source file specified"));
    if (!db) return Promise.reject(new Error("No database connection specified"));

    const date = getFileDate(file);
    if (!date) reject(new Error("No date in filename"));

    return new Promise((resolve, reject) => {
        const fileReader = createInterface({
            input: createReadStream(file)
        });

        fileReader.on("line", line => {
            parseLine(line, date).then(filterData).then(data => {
                // insert data only if filter lets them throughfilter lets them through
                if (data) return add(data);
                return false;
            }).catch(reason => reject(reason));
        });

        fileReader.on("close", () =>{
            resolve(true);
        }
    })
}

/**
 * parses a wikipedia pagecount line into an object
 * @access private
 * 
 * @param line {String} line to parse
 * @param date {Date} regarding date
 *
 * @return {Promise} Promise which is resolved with the parsed object
 */
function parseLine(line, date) {
    const fields = line.split(/\s/);

    const result = {};
    result[fields[0]][fields[1]][date.year][date.month][date.day][date.hour] = fields[2];

    return Promise.resolve(result);
}

/**
 * filters a dataset, ist only pipes through regular wikipedia articles
 * @access private
 *
 * @param data {Object} parsed object
 *
 * @return {Object / Boolean} data if not filtered out, otherwise false
 */
function filterData(data) {
    for (let k in data) {
        if (/./.match(k)) {
            return false;
        }
    }

    return data;
}

/**
 * gets the dataset date from filename if in format yyyy-mm-dd-hh
 * @access private
 *
 * @param filename {String} the filename
 *
 * @return {Date} date object (false if parsing was not successful)
 */
function getFileDate(filename) {
    const match = /(\d){4}-(\d){2}-(\d){2}-(\d){2}/.exec(filename);

    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]));
    } else {
        return false;
    }
}

