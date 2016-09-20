import * as chai from "chai"
import parseFileName from "../../../src/elasticsearch/parsing/parseFileName";

const assert = chai.assert;

suite("parseFileName", function() {
    test("parses file name into correct date", function() {
        const filename = "2016-07-21-11";
        const date = parseFileName(filename);

        assert.equal(date.getFullYear(), 2016);
        assert.equal(date.getMonth(), 6);
        assert.equal(date.getDate(), 21);
        assert.equal(date.getHours(), 11);

        const filename2 = "trash2016-07-21-11.ending";
        const date2 = parseFileName(filename2);

        assert.equal(date2.getFullYear(), 2016);
        assert.equal(date2.getMonth(), 6);
        assert.equal(date2.getDate(), 21);
        assert.equal(date2.getHours(), 11);
    })
})
