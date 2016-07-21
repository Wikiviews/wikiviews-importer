import getArguments from "minimist";
import download from "./download/download";
import dbadd from "./database/dbadd";
import * as zlib from "zlib";
import {MongoClient} from "mongodb";
import {readdir} from "fs";
import * as path from "path";
import gunzipMulti from "gunzip-multi";

class PatternRange {
    constructor(variable, start, end) {
        this.variable = variable;
        this.start = start;
        this.end = end;
    }
}

// setup arguments
const cliArgs = getArguments(process.argv);
const defaultArgs = {
    sourcePattern: "https://dumps.wikimedia.org/other/pagecounts-raw/2016/2016-07/pagecounts-bbbbffjj-ll0000.gz",
    destFilePattern: "bbbb-ff-jj-ll.csv",
    noDownload: undefined,
    noDB: undefined,
    destDir: "./data",
    dbPort: 27017,
    dbAddr: "127.0.0.1",
    dbDB: "wikipedia",
    dbCollection: "pagecounts",
    years: "b:2016-2016",
    months: "f:1-12",
    days: "j:1-31",
    hours: "l:0-23",
    decompress: undefined
}
const args = Object.assign(defaultArgs, cliArgs);

// setup db connection
let dbCollection;
if (!args.noDB) {
    dbCollection = MongoClient.connect(`mongodb://${args.dbAddr}:${args.dbPort}/${args.dbDB}`).then(db => db.collection(args.dbCollection)).then(col => {
        console.log(`Connected to mongodb at ${args.dbAddr}:${args.dbPort} with db ${args.dbDB} at collection ${args.dbCollection}`);
        return col;
    });

    dbCollection.catch(reason => {
        console.error(reason);
    });
}

if (!args.noDownload) {
    // parse ranges
    const years = parsePatternRange(args.years);
    if (!years) {
        console.error(new Error("Wrong year range specified")); 
        process.exit(1);
    }

    const months = parsePatternRange(args.months);
    if (!months) {
        console.error(new Error("Wrong month range specified"))
        process.exit(1);
    }

    const days = parsePatternRange(args.days);
    if (!days) {
        console.error(new Error("Wrong day range specified"))
        process.exit(1);
    }
    
    const hours = parsePatternRange(args.hours);
    if (!hours) {
        console.error(new Error("Wrong hour range specified"))
        process.exit(1);
    }

    // setup pattern rules
    const rules = [{
        variable: years.variable, 
        from: years.start,
        to: years.end
    }, {
        variable: months.variable,
        from: months.start,
        to: months.end
    }, {
        variable: days.variable,
        from: days.start,
        to: days.end
    }, {
        variable: hours.variable,
        from: hours.start,
        to: hours.end
    }];

    // setup decompressor
    let decompressor;
    switch(args.decompress) {
        case 'gz':
            decompressor = gunzipMulti;
            break;
        case 'zip':
            decompressor = zlib.Unzip;
            break;
        default:
            decompressor = () => undefined;
            break;
    }

    // start downloads
    download(args.sourcePattern, rules, {destPattern: args.destFilePattern, dir: args.destDir}, decompressor).map(prms => {
        let currentPath;
        return prms.then(path => {
            // log each download
            console.log(`${path} downloaded.`);
            currentPath = path;
            return path;
        }).then(path => {
            // add each downloaded file to the database (if not disabled)
            if (!args.noDB) {
                return dbCollection.then(col => dbadd(path, col, console.log)).catch(reason => console.error(reason));
            } else {
                return null;
            }
        }).then(dbAction => {
            // log database action
            if (dbAction) console.log(`File ${currentPath} added to database`); 
            return dbAction;
        }).catch(reason => console.error(reason));
    });
} else if (!args.noDB) {
    // add files from data directory to database
    new Promise((resolve, reject) => {
        // get all filenames from data directory and generate filepaths
        readdir(args.destDir, (err, files) => {
            if (err) return reject(err);

            resolve(files.map(file => path.resolve(args.destDir, file)));
        });
    }).then(files => {
        return files.map(file => {
            // add data to database if connection is set up (resolved -> then); ingore failure, because it was logged once after setup (rejected -> catch)
            return dbCollection.then(col => dbadd(file, col, console.log)).then(dbAction => {
                // pass through dbAction status and current file
                return {dbAction: dbAction, file: file};
            }).catch(reason => console.error(reason));
        })
    }).then(dbActions => {
       return objectIds.map(dbActionPrms => {
           dbActionPrms.then(dbAction => {
                // log all database actions
                if (dbAction.dbAction) console.log(`File ${dbAction.file} added to database`);
                return dbAction;
           }).catch(reason => console.error(reason));
       });
     });
}


function parsePatternRange(rangeString) {
    const match = /(\w):(\d+)-(\d+)/g.exec(rangeString);

    return (match) ? new PatternRange(match[1], match[2], match[3]) : null;
}

