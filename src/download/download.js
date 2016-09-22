/*
 * Copyright 2016 DevWurm
 * Licensed under MIT (https://github.com/DevWurm/angular2-tables-testdata-provider/blob/master/LICENSE)
 */

import * as path from "path";
import { createWriteStream } from "fs";
import { get as httpRequest } from "http";
import { get as httpsRequest } from "https";
import { parse as parseUrl } from "url";
import { Transform } from "stream";
import { EventEmitter } from "events";
import { expand } from 'pattern-expander';
import type { DownloadSettings } from '../settings/settings';
import { createGunzip, createUnzip } from 'zlib';

/**
 * Event emitter for emitting launch events
 * @access private
 */
class LaunchEmitter extends EventEmitter {
  constructor() {
    super();
  }

  launch() {
    this.emit('launch');
  }
}

/**
 * downloads a row of files, identified by patterns
 * @access public
 *
 * @param settings {DownloadSettings} parameters for the download process
 *
 * @return {[Promise]} Array of promises of which each either contain the file path of the resulting file or the resulting data
 */
export default function download(settings: DownloadSettings): Promise<string>[] {
  const expansionRules = [settings.years, settings.months, settings.days, settings.hours];
  const sources = expand(settings.source, expansionRules);
  const outputs = expand(settings.output, expansionRules);
  const decompressorFactory = getDecompressorFactory(settings.compression);

  const paths = sources.map((src, key) => {
    return { source: src, dest: path.resolve(settings.destination, outputs[key]) };
  });

  return downloadChunks(paths, (settings.concurrent || paths.length), decompressorFactory);
}

/**
 * downloads a row of files in chunks
 *
 * @access public
 *
 * @param paths {[Object]} source and destination paths for the files, which should be downloaded
 * @param chunkSize {Number} number of concurrently downloaded files
 * @param decompressorFactory {Function<Transform>} [Optional] Function which generated a Decompressor stream. If specified the data will be decompressed using the specified decompressor stream
 * @param launcher {EventEmitter} [Optional] EventEmitter, which emits the launch event, if the first chunk should be started (if not provided, chunks get downloaded immediately)
 *
 * @return {[Promise]} Array of Promises, which either contain the file path of the resulting files or the resulting data
 */
export function downloadChunks(paths: {source: string, dest: string}[], chunkSize: number, decompressorFactory: ?Function<Transform>, launcher: ?EventEmitter): Promise<string>[] {
  if (paths.length < 1) {
    return [];
  } else if (paths.length <= chunkSize) {
    return paths.map(path => {
      return downloadFile(path.source, path.dest, decompressorFactory, launcher);
    });
  } else {
    // if more elements should be downloaded than the current chunk size, create a new launcher, and download remaining elements, when the
    // current chunk is finished
    const currentChunk = paths.slice(0, chunkSize);
    const nextChunks = paths.slice(chunkSize);
    const nextLauncher = new LaunchEmitter();

    const currentPromises = currentChunk.map(path => {
      return downloadFile(path.source, path.dest, decompressorFactory, launcher);
    });

    // launch next downloads if current downloads are finished
    Promise.all(currentPromises).then(_ => {
      nextLauncher.launch();
    }).catch(_ => {
      nextLauncher.launch();
    });

    return currentPromises.concat(downloadChunks(nextChunks, chunkSize, decompressorFactory, nextLauncher));
  }
}

/**
 * downloads a file
 * @access public
 *
 * @param url {String} url of the source file
 * @param target {String} target file
 * @param decompressorFactory {Function<Transform>} [Optional] If specified the data will be decompressed using the generated decompressor stream
 * @param launcher {LaunchEmitter} [Optional] If specified, the download is triggered by the launch emitter
 *
 * @return {Promise} Promise which is either resolved with the target path or rejected with errors while downloading
 */
export function downloadFile(url: string, target: string, decompressorFactory: ?Function<Transform>, launcher: ?LaunchEmitter): Promise<string> {
  return new Promise((resolve, reject) => {
    if (launcher) {
      launcher.on('launch', () => performDownload(resolve, reject));
    } else {
      performDownload(resolve, reject);
    }
  });

  function performDownload(resolve, reject) {
    const request = parseUrl(url).protocol == 'https:' ? httpsRequest : httpRequest;

    // create and send get request to url
    const req = request(url, res => {
      const out = createWriteStream(target);

      res.on('error', reject);
      out.on('error', reject);

      if (decompressorFactory) {
        res.pipe(decompressorFactory()).pipe(out)
      } else {
        res.pipe(out);
      }

      out.on('finish', () => out.close(() => resolve(target)));
    });

    req.on('error', reject);
  }
}

function getDecompressorFactory(compression: string): ?Function<Transform> {
  switch (compression) {
    case 'gz':
      return createGunzip;
      break;
    case 'zip':
      return createUnzip;
      break;
    default:
      return null;
      break;
  }
}
