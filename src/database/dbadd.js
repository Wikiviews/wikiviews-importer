import {createInterface} from "readline";
import {createReadStream} from "fs";
import {parseFileName} from "../parsing/parseFileName";
import {parseLine} from "../parsing/parseLine";

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

    const date = parseFileName(file);
    if (!date) reject(new Error("No date in filename"));

    return new Promise((resolve, reject) => {
        const fileReader = createInterface({
            input: createReadStream(file)
        });

        fileReader.on("line", line => {
            parseLine(line, date).then(data => {
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
