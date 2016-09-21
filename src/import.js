// @flow
import download from "./download/download";
import insert from "./elasticsearch/insert";
import fileExists from "file-exists";
import * as path from "path";
import {expand} from 'pattern-expander';
import { getSettings } from './settings/settings';
import type { DownloadSettings } from './settings/settings';

const settings = getSettings(process.argv);

// if data should be downloaded, download files and return file paths in promises
// if data shouldn't be downloaded, create a promise with the file path for every file, which exists in the destDir
const dataPaths = settings.tasks.download ?
  download(settings.download) :
  getPresentPaths(settings.download);

// log paths when they exist
dataPaths.forEach(pathPrms => {
  return pathPrms.then(path => console.log(`${path} is available`))
});

if (settings.tasks.elasticsearch) {
  dataPaths.map(pathPrms => {
    return pathPrms.then(path => insert(path, settings.elasticsearch));
  }).map(pathPrms => {
    pathPrms.then(path => {
      console.log(`${path} inserted into database`);
    }).catch(reason => {
      console.error(`Error while inserting into database: ${reason}`);
    })
  })
}

function getPresentPaths(settings: DownloadSettings): Promise<string>[] {
  const expansionRules = [settings.years, settings.months, settings.days, settings.hours];
  return expand(settings.output, expansionRules)
    .map(fileName => path.resolve(settings.destination, fileName))
    .filter(fileExists).map(Promise.resolve.bind(Promise));
}
