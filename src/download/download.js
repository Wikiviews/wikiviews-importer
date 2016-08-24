/*
 * Copyright 2016 DevWurm
 * Licensed under MIT (https://github.com/DevWurm/angular2-tables-testdata-provider/blob/master/LICENSE)
 */

import * as path from "path";
import { createWriteStream } from "fs";
import { get as httpRequest } from "http";
import { get as httpsRequest } from "https";
import { parse as parseUrl } from "url";
import { Transform, Writable } from "stream";
import applyPattern from "../patterns/applyPattern";
import { EventEmitter } from "events";


/**
 * Transform stream which does nothing then piping the content to the next stream
 * @access private
 */
class PassiveStream extends Transform {
  constructor() {
    super();
  }

  _transform(data, encoding, done) {
    this.push(data);
    done();
  };
}

/**
 * Writer which writes the content into the result property
 * @access private
 */
class StringWriter extends Writable {
  constructor() {
    super();
    this.result = "";
  }

  _write(chunk, enc, next) {
    this.result += chunk.toString(enc);
    next();
  };
}

/**
 * Event emitter for emitting launch events
 * @access private
 */
class LaunchEmitter extends EventEmitter {
}

/**
 * downloads a row of files, identified by patterns
 * @access public
 *
 * @param sourcePattern {String} url pattern, which contains variables which will be substituded by the rules specified in the rules parameter
 * @param rules {[Object]} array of rule objects. Each rule object needs a variable field and either a from and to property or a values array
 * @param dest {Object} [Optional] iObject containing of a string with the destination file pattern, which is applied like the sourcePattern, as well as a directory, in which the detination file will be written. If not provided the file contents are provided via the return value
 * @param decompressor {Function} [Optional] Constructor function, for a decompressor stream. If specified the data will be decompressed using the specified decompressor stream
 * @param chunkSize {Number} [Optional] number of concurrently downloaded files
 *
 * @return {[Promise]} Array of promises of which each either contains the filepath of the resulting file or the resulting data
 */
export default function download(sourcePattern, rules, { destPattern, dir }, decompressor, chunkSize) {
  const sources = applyPattern(sourcePattern, rules);
  const dests = destPattern ? applyPattern(destPattern, rules) : null;

  const paths = sources.map((src, key) => {
    return dests ? { source: src, dest: path.resolve(dir, dests[key]) } : { source: src };
  })

  return downloadChunks(paths, (chunkSize || paths.length), decompressor);
}

/**
 * downloads a row of files in chunks
 *
 * @access public
 *
 * @param paths {[Object]} source and dest paths for the files, which should be downloaded
 * @param chunkSize {Number} number of concurrently downloaded files
 * @param decompressor {Function} [Optional] Constructor function, for a decompressor stream. If specified the data will be decompressed using the specified decompressor stream
 * @param launcher {EventEmitter} [Optional] EventEmitter, which emmits the launch event, if the first chunk should be started (if not provided, chunks started immediantly)
 *
 * @return {[Promise]} Array of Promises, which either contain the filepath of the resulting files or the resulting data
 */
export function downloadChunks(paths, chunkSize, decompressor, launcher) {
  if (paths.length < 1) return [];

  const currentChunk = paths.slice(0, chunkSize);
  const nextChunks = paths.slice(chunkSize);
  const nextLauncher = new LaunchEmitter();

  const currentPromises = currentChunk.map(identifier => {
    if (launcher) {
      return new Promise((resolve, reject) => {
        launcher.on('launch', () => {
          downloadFile(identifier.source, identifier.dest, decompressor()).then(resolve).catch(reject);
        })
      })
    } else {
      return downloadFile(identifier.source, identifier.dest, decompressor());
    }
  });

  Promise.all(currentPromises).then((data) => {
    nextLauncher.emit('launch')
  }).catch((reason) => {
    nextLauncher.emit('launch')
  });

  return currentPromises.concat(downloadChunks(nextChunks, chunkSize, decompressor, nextLauncher));
}

/**
 * downloads and uncompresses a file, if it's a compressed file
 * @access public
 *
 * @param url {String} url of the source file
 * @param target {String} [Optional] If specified the result of the download is stored in the target file, otherwise it's rported via the return value (not recommended)
 * @param decompressor {Stream} [Optional] If specified the data will be decompressed using the specified decompressor stream
 *
 * @return {Promise} Promise which is either resolved with the content of the downlaod file or the filepath
 */
export function downloadFile(url, target, decompressor) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('Nor target Url specified'));

    const urlData = parseUrl(url);

    const request = urlData.protocol == 'https:' ? httpsRequest : httpRequest;

    // create and send get request to url
    const req = request(url, res => {
      const out = target ? createWriteStream(target) : new StringWriter();
      const dec = decompressor ? decompressor : new PassiveStream();

      res.on('error', reject);
      out.on('error', reject);

      res.pipe(dec).pipe(out);

      out.on('finish', () => out.close(() => resolve(target ? target : out.result)));
    });

    req.on('error', reject);
  });
}

