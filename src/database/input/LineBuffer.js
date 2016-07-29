import {Transform} from "stream";

/**
 * transform stream which consumes a Readable stream and bufferes a specific number of lines until it emits data
 */
export default class LineBuffer extends Transform {
    constructor(bufferSize, encoding) {
        super({objectMode: true});

        this._bufferSize = bufferSize;
        this._encoding = encoding;

        this._lines = []

        this._remainingChunk = "";
    }

    _transform(chunk, encoding, done) {
        if (this._lines.length >= this._bufferSize) {
            this.push(this._lines);
            this._lines = [];
        }

        let data = chunk.toString(this._encoding);

        if (this._remainingChunk) data = this._remainingChunk + data;
    
        const lines = data.split('\n')
        this._remainingChunk = lines.splice(lines.length-1,1)[0]

        this._lines = this._lines.concat(lines);

        done()
    }

    _flush(done) {
        if (this._remainingChunk) this._lines.push(this._remainingChunk);
        this.push(this._lines);

        done();
    }
}
