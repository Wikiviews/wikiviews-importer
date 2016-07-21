import {createInterface} from "readline";
import {createReadStream} from "fs";
import parseFileName from "./parsing/parseFileName";
import parseLine from "./parsing/parseLine";

/**
 * adds the wikipedia pageview data in the specified file into the passed db connection
 * @access public
 *
 * @param file {String} filepath of the source file
 * @param col {Collection} mongodb collection object
 * @param logger {Function} [Optional] Function which gets called with data for logging
 *
 * @return {Promise} Promise which is resolved with true and rejected with errors while inserting into db
 */
export default function dbadd(file, col, logger) {
    if (!file) return Promise.reject(new Error("No source file specified"));
    if (!col) return Promise.reject(new Error("No database connection specified"));

    const date = parseFileName(file);
    if (!date) return Promise.reject(new Error("No date in filename"));

    return new Promise((resolve, reject) => {
        const fileReader = createInterface({
            input: createReadStream(file)
        });

        fileReader.on("line", line => {
            parseLine(line, date).then(data => col.insertOne(data)).then(insertResult => {
              if (!insertResult.insertedCount) throw new Error("Data wasn't inserted"); 
              if (logger) logger(`Added ${insertResult.insertedCount} datarow with the id ${insertResult.insertedId}`);
              return insertResult;
            }).catch(reason => reject(reason));
        });

        fileReader.on("close", () =>{
            resolve(true);
        })
    })
}

