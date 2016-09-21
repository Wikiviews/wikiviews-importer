// @flow

import { createReadStream } from "fs";
import LineBuffer from "./input/LineBuffer";
import { createHash } from "crypto";
import type { ElasticsearchSettings } from '../settings/settings';
import { fileNameToDate } from './parsing/parsing';
import { parseLine } from './parsing/parsing';
import type { Dataset } from './parsing/parsing';
import { Client } from 'elasticsearch';

/**
 * adds the Wikipedia pageview data in the specified file into the specified Elasticsearch instance
 * @access public
 *
 * @param file {String} file path of the source file
 * @param settings {ElasticsearchSettings} parameters for the insertion process
 *
 * @return {Promise} Promise which is resolved with the source file Path and rejected with errors while inserting into db
 */
export default function insert(file: string, settings: ElasticsearchSettings): Promise<string> {
  const date = fileNameToDate(file);
  if (!date) return Promise.reject(new Error("No date in filename"));

  return new Promise((resolve, reject) => {
    const fileReader = createReadStream(file);
    const buffer = new LineBuffer(settings.batch);
    fileReader.pipe(buffer);

    buffer.on("data", lines => {
      fileReader.pause();
      const data = lines.map(line => parseLine(line));
      addChunkToIndex(data, date, settings).then(result => {
        if (!result) throw new Error("Data wasn't inserted");

        // log insertion information
        console.log(result);

        fileReader.resume();
        return true;
      }).catch(reason => reject(reason));
    });

    buffer.on("end", () => {
      resolve(file);
    })
  })
}

function addChunkToIndex(data: Dataset[], date: Date, settings: ElasticsearchSettings): Promise<string> {
  const client = getClient(settings.address, settings.port);
  const operations = [].concat.apply([], data.map(datarow => {
    const id = getHash(datarow.article);

    return [
      { update: { _index: settings.index, _type: settings.type, _id: id, _retry_on_conflict: 5 } },
      {
        lang: "groovy",
        script_file: "add-date",
        params: {
          new_date: {
            date: date.toISOString(),
            views: datarow.views
          }
        },
        upsert: {
          article: datarow.article,
          exact_article: datarow.article,
          views: [
            {
              date: date.toISOString(),
              views: datarow.views
            }
          ]
        }
      }
    ]
  }));

  return client.bulk({ body: operations });
}

type ElasticsearchClient = {
  bulk: Function
}
export function getClient(address: string, port: number): ElasticsearchClient {
 return new Client({host: `${address}:${String(port)}`});
}

function getHash(inputString: string): string {
  return createHash('sha1')
    .update(inputString)
    .digest('hex');
}
