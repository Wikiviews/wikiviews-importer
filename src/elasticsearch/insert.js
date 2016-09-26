// @flow

import { createReadStream } from "fs";
import { LineBuffer } from "./input/LineBuffer";
import { createHash } from "crypto";
import type { ElasticsearchSettings } from '../settings/settings';
import { fileNameToDate } from './parsing/parsing';
import { parseLine } from './parsing/parsing';
import type { Dataset } from './parsing/parsing';
import { Client } from 'elasticsearch';
import { LaunchEmitter } from '../util/LaunchEmitter';

/**
 * inserts a row of files into elasticsearch
 * @access public
 *
 * @param files {Promise<string>[]} The file paths, which will exist in the future
 * @param settings {ElasticsearchSettings} settings for the insertion process
 *
 * @return {Promise<string>[]} Array of promises, which either contain the inserted file paths or errors while inserting
 */
export function insert(files: Promise<string>[], settings: ElasticsearchSettings): Promise<string>[] {
  return insertChunks(files, (isFinite(settings.concurrent) ? settings.concurrent : files.length), settings);
}
export default insert;

/**
 * inserts a row of files in chunks into Elasticsearch
 *
 * @access private
 *
 * @param files {Promise<string>[]} The file paths, which will exist in the future
 * @param chunkSize {number} number of concurrently inserted files
 * @param settings {ElasticsearchSettings} settings for the insertion process
 * @param launcher {EventEmitter} [Optional] EventEmitter, which emits the launch event, if the first chunk should be started (if not provided, chunks get downloaded immediately)
 *
 * @return {Promise<string>[]} Array of promises, which either contain the inserted file paths or errors while inserting
 */
function insertChunks(files: Promise<string>[], chunkSize: number, settings: ElasticsearchSettings, launcher: ?LaunchEmitter): Promise<string>[] {
  if (files.length < 1) {
    return [];
  } else if (files.length <= chunkSize) {
    return files.map((file: Promise<string>) => {
      return file.then(path => insertFile(path, settings, launcher));
    });
  } else {
    // if more elements should be inserted than the current chunk size, create a new launcher, and download remaining elements, when the
    // current chunk is finished
    const currentChunk = files.slice(0, chunkSize);
    const nextChunks = files.slice(chunkSize);
    const nextLauncher = new LaunchEmitter();

    const currentPromises = currentChunk.map((file: Promise<string>) => {
      return file.then(path => insertFile(path, settings, launcher));
    });

    // launch next downloads if current insertions are finished
    Promise.all(currentPromises).then(_ => {
      nextLauncher.launch();
    }).catch(_ => {
      nextLauncher.launch();
    });

    return currentPromises.concat(insertChunks(nextChunks, chunkSize, settings, nextLauncher));
  }
}

/**
 * adds the Wikipedia pageview data in the specified file into the specified Elasticsearch instance
 * @access public
 *
 * @param file {String} file path of the source file
 * @param settings {ElasticsearchSettings} parameters for the insertion process
 * @param launcher {LaunchEmitter} [Optional] If specified, the insertion is triggered by the launch emitter
 *
 * @return {Promise} Promise which is resolved with the source file Path and rejected with errors while inserting into db
 */
export function insertFile(file: string, settings: ElasticsearchSettings, launcher: ?LaunchEmitter): Promise<string> {
  return new Promise((resolve, reject) => {
    if (launcher) {
      launcher.on('launch', () => performInsertion(resolve, reject));
    } else {
      performInsertion(resolve, reject);
    }
  });

  function performInsertion(resolve, reject) {
    const date = fileNameToDate(file);
    if (!date) return Promise.reject(new Error("No date in filename"));

    const fileReader = createReadStream(file);
    const client = getClient(settings.address, settings.port);
    const buffer = new LineBuffer(settings.batch);
    fileReader.pipe(buffer);

    buffer.on("data", lines => {
      fileReader.pause();
      const data = lines.map(line => parseLine(line));
      addDatasetsToIndex(data, date, settings, client).then(result => {
        if (!result) throw new Error("Data wasn't inserted");

        // log insertion information
        console.log(`Inserted ${result.items.length} rows into Elasticsearch`);

        fileReader.resume();
        return true;
      }).catch(reason => {
        client.close();
        reject(reason)
      });
    });

    buffer.on("end", () => {
      client.close();
      resolve(file);
    })
  }
}

/**
 * Adds an array of datasets into the specified index.
 *
 * @access private
 *
 * @param data {Dataset[]} The datasets, which should be inserted.
 * @param date {Date} The corresponding date for the datasets.
 * @param settings {ElasticsearchSettings} The settings for the insertion process.
 * @param client {ElasticsearchClient} ES client for the insertion process
 *
 * @return {Promise<Object[]>} Promise resolved with the result objects or rejected with errors while inserting.
 */
function addDatasetsToIndex(data: Dataset[], date: Date, settings: ElasticsearchSettings, client: ElasticsearchClient): Promise<Object> {
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
  bulk: Function,
  close: Function
}
/**
 * Provides an Elasticsearch Client for an Elasticsearch at the specified location.
 *
 * @access private
 *
 * @param address {string} Address of the Elasticsearch instance.
 * @param port {number} Port of the Elasticsearch instance.
 *
 * @return {ElasticsearchClient} The client for interaction with the specified Elasticsearch instance.
 */
export function getClient(address: string, port: number): ElasticsearchClient {
 return new Client({host: `${address}:${String(port)}`});
}

/**
 * Generates the sha1 hash of a string.
 *
 * @access private
 *
 * @param inputString {string} String, which should be hashed.
 *
 * @return {string} sha1 hash of input string.
 */
function getHash(inputString: string): string {
  return createHash('sha1')
    .update(inputString)
    .digest('hex');
}
