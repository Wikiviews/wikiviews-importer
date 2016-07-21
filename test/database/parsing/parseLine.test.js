import * as chai from "chai"
import parseLine from "../../../src/database/parsing/parseLine";

const assert = chai.assert;

suite("parseLine", function() {
    test("parses line into correct datastructure", function(done) {
        const line = "en Main_Page 242332 4737756101";
        const date = new Date(2016, 6, 21, 11);

        parseLine(line, date).then(result => {
            assert.equal(result.project, "en");
            assert.equal(result.page, "Main_Page");
            assert.deepEqual(result.date, date);
            assert.equal(result.count, 242332);
            done()
        }).catch(reason => {
            assert.fail(reason);
            done()
        })
    })
})
