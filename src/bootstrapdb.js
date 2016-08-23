import { parseArguments, getDecompressor, getPatternRules } from "./arguments/arguments";
import download from "./download/download";
import applyPattern from "./patterns/applyPattern";
import dbadd, { dbsetup } from "./database/dbadd";
import { getDBClient } from "./database/client";
import fileExists from "file-exists";

// setup arguments
const args = parseArguments(process.argv);

// get rules for patterns
const rules = getPatternRules(args);

// if data should be downloaded, download files and return file paths in promises
// if data shouldn't be downloaded, create a promise with the file path for every file, which exists in the destDir
const dataPaths = !args.noDownload ?
  download(args.sourcePattern, rules, {
    destPattern: args.destFilePattern,
    dir: args.destDir
  }, getDecompressor(args), args.flowControl) :
  applyPattern(args.destFilePattern, rules).map(fileName => path.resolve(args.destDir, fileName)).filter(fileExists).map(Promise.resolve);

// log paths when they exist
dataPaths.forEach(pathPrms => pathPrms.then(path => console.log(`${path} is available`)));

if (!args.noDB) {
  const insertedPaths = dataPaths.map(pathPrms => {
    pathPrms.then(path => dbadd(path, { client: getDBClient(args.dbAddr, args.dbPort), index: args.dbIndex, type: args.dbType}, args.dbBuffer, console.log));
  });

  insertedPaths.map(pathPrms => {
    pathPrms.then(path => {
      console.log(`${path} inserted into database`);
    }).catch(reason => {
      console.error(`Error while inserting into database: ${reason}`);
    })
  })
}

