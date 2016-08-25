import { createReadStream } from "fs";
import parseFileName from "./parsing/parseFileName";
import parseLine from "./parsing/parseLine";
import LineBuffer from "./input/LineBuffer";
import { createHash } from "crypto";

/**
 * adds the wikipedia pageview data in the specified file into the passed db connection
 * @access public
 *
 * @param file {String} filepath of the source file
 * @param client {Client} elasticsearch Client object
 * @param index {string} index in which the datarow should be inserted
 * @param type {string} type as which the datarow should be inserted
 * @param bufferSize {Number} number of suddenly parsed and inserted datarows
 * @param logger {Function} [Optional] Function which gets called with data for logging
 *
 * @return {Promise} Promise which is resolved with true and rejected with errors while inserting into db
 */
export default function dbadd(file, { client, index, type }, bufferSize, logger) {
  if (!file) return Promise.reject(new Error("No source file specified"));
  if (!client) return Promise.reject(new Error("No database connection specified"));
  if (!index) return Promise.reject(new Error("No database index specified"));
  if (!type) return Promise.reject(new Error("No database type specified"));

  const date = parseFileName(file);
  if (!date) return Promise.reject(new Error("No date in filename"));

  return new Promise((resolve, reject) => {
    const fileReader = createReadStream(file);
    const buffer = new LineBuffer(Number(bufferSize));
    fileReader.pipe(buffer);

    buffer.on("data", lines => {
      fileReader.pause();
      const data = lines.map(line => parseLine(line, date));
      addChunkToIndex(data, client, index, type).then(result => {
        if (!result) throw new Error("Data wasn't inserted");
        if (logger) {
          logger(result);
        }
        fileReader.resume();
        return true;
      }).catch(reason => reject(reason));
    });

    buffer.on("end", () => {
      resolve(file);
    })
  })
}

function addChunkToIndex(chunk, client, index, type) {
  const operations = [].concat.apply([], chunk.map(datarow => {
    const id = getHash(datarow.article);

    return [
      { update: { _index: index, _type: type, _id: id, _retry_on_conflict: 5 } },
      {
        lang: "groovy",
        script_file: "add-count",
        params: {
          new_count: {
            date: datarow.date.toISOString(),
            count: Number(datarow.count)
          }
        },
        upsert: {
          article: datarow.article,
          exact_article: datarow.article,
          counts: [
            {
              date: datarow.date.toISOString(),
              count: Number(datarow.count)
            }
          ]
        }
      }
    ]
  }));

  return client.bulk({ body: operations });
}

function getHash(inputString) {
  return createHash('sha1')
    .update(inputString)
    .digest('hex');
}

/**
 * sets up the database (create correct indexes)
 *
 * @access public
 *
 * @param client {Client} elasticsearch Client object
 * @param index {string} index in which the datarow should be inserted
 * @param type {string} type as which the datarow should be inserted
 *
 * @return {Promise} Promise resolved with the collection or rejected with errors during setup
 */
export function dbsetup(client, index, type) {
  return client.indices.create({
    index: index,
    body: {
      "settings": {
        "number_of_shards": 10,
        "number_of_replicas": 0
      },
      "mappings": {
        [type]: {
          "properties": {
            "article": { "type": "string" },
            "exact_article": {
              "type":  "string",
              "index": "not_analyzed"
            },
            "counts": {
              "type": "nested",
              "properties": {
                "date": { "type": "date", "format": "strict_date_time" },
                "count": { "type": "long" }
              }
            }
          }
        }
      }
    }

  });
}
