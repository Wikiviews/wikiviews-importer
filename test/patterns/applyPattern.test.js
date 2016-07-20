import * as chai from "chai";
import applyPattern from "../../src/patterns/applyPattern.js";

const assert = chai.assert;

suite("applyPattern", function() {
    suite("applyPattern", function() {
        test("apply pattern without variable", function() {
            assert.equal(applyPattern("test", []), ["test"]);
        })

        test("apply pattern with one variable", function() {
            const rules = [{
                variable: "x",
                values: [1,2]
            }];

            assert.equal(applyPattern("testx", rules), ["test1", "test2"]);
        })

        test("apply pattern with multiple variables", function() {
            const rules = [{
                variable: "x",
                values: [1,2]
            }, {
                variable: "y",
                values: [1,2]
            }];

            assert.equal(applyPattern("xtesty", rules), ["1test1", "1test2", "2test1", "2test2"]);
            assert.equal(applyPattern("tesxty", rules), ["tes1t1", "tes1t2", "tes2t1", "tes2t2"]);
            assert.equal(applyPattern("tesxyt", rules), ["tes11t", "tes12t", "tes21t", "tes22t"]);
        })

        test("apply pattern with range option", function() {
            const rules = [{
                variable: "x",
                from: 1,
                to: 3
            }];

            assert.equal(applyPattern("testx", rules), ["test1", "test2", "test3"]);
        })

        test("apply pattern which requires padding", function() {
            const rules = [{
                variable: "x",
                values: [1]
            }];

            const rules2 = [{
                variable: "x",
                values: [1],
                padChar: '.'
            }];
 

            assert.equal(applyPattern("testxxx", rules), ["test001"]);
            assert.equal(applyPattern("testxxx", rules2), ["test..1"]);
        })

        test("apply pattern with non-numerical values", function() {
            const rules = [{
                variable: "x",
                values: ["test"]
            }];

            assert.equal(applyPattern("testx", rules), ["testtest"]);
        })
    })
})
