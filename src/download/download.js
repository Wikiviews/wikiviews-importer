/*
 * Copyright 2016 DevWurm
 * Licensed under MIT (https://github.com/DevWurm/angular2-tables-testdata-provider/blob/master/LICENSE)
 */

import * as path from "path";
import {createWriteStream} from "fs";
import {request as httpRequest} from "http";
import {request as httpsRequest} from "https";
import {parse as parseUrl} from "url";
import {Transform, Writable} from "stream";
import applyPattern from "../patterns/applyPattern";

/**
 * downloads a row of files, identified by patterns
 * @access public
 *
 * @param sourcePattern {String} url pattern, which contains variables which will be substituded by the rules specified in the rules parameter
 * @param rules {[Object]} array of rule objects. Each rule object needs a variable field and either a from and to property or a values array
 * @param destPattern {String} [Optional] destination file pattern, which is applied like the sourcePattern. If not provided the file contents are provided via the return value
 * @param decompressor {Stream} [Optional] If specified the data will be decompressed using the specified decompressor stream
 *
 * @return {[Promise]} Array of promises of which each either contains the filepath of the result path or the resulting data
 */
export default function download(sourcePattern, rules, destPattern) {
    let paths = [];
    const sources = applyPattern(sourcePattern, rules);
    if (destPattern) {
        const dests = applyPattern(destPattern, rules);
        paths = sources.map((src, key) => {source: src, dest: dests[key]};);
    } else {
        paths = sources.map(src => {source: src});
    }

    return paths.map(identifier => downloadFile(identifier.source, identifier.dest, decompressor));
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
        
        const request = parseUrl(url).protocol == 'https:' ? httpsRequest : httpRequest;

        // create and send get request to url
        const req = request(url, res => {
            const out = target ? createWriteStream(target) : new StringWriter();
            const dec = decompressor ? decompressor : new PassiveStream();

            res.on('error', reject);
            dec.on('error', reject);
            out.on('error', reject);
            
            res.pipe(dec).pipe(out);

            out.on('finish', () => resolve(target ? target : out.result));
        });

        req.end()

        req.on('error', reject);
    });
}


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
