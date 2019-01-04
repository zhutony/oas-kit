#!/usr/bin/env node

// this example requires async/await

'use strict';

const fs = require('fs');

const yaml = require('js-yaml');
const fetch = require('node-fetch-h2');
const bae = require('better-ajv-errors');

const swagger2openapi = require('./index.js');
const validator = require('oas-validator');

process.exitCode = 1;

let argv = require('yargs')
    .boolean('bae')
    .alias('b','bae')
    .describe('bae','enable better-ajv-errors')
    .boolean('lint')
    .describe('lint','also lint the document')
    .alias('l','lint')
    .array('lintSkip')
    .describe('lintSkip','linter rule name(s) to skip')
    .alias('s','lintSkip')
    .count('quiet')
    .alias('q','quiet')
    .describe('quiet','reduce verbosity')
    .count('verbose')
    .default('verbose',1)
    .alias('v','verbose')
    .describe('verbose','increase verbosity')
    .demand(1)
    .argv;

function main(){
    return new Promise(async function(resolve,reject){
        argv.resolve = true;
        argv.patch = true;
        argv.source = argv._[0];
        if (argv.bae) {
            argv.validateSchema = 'first';
            argv.prettify = true;
        }
        let options;
        if (argv.source.startsWith('http')) {
            options = await swagger2openapi.convertUrl(argv.source,argv);
        }
        else {
            options = await swagger2openapi.convertFile(argv.source,argv);
        }
        let result = false;
        try {
            result = await validator.validateSync(options.openapi,options);
        }
        catch (ex) {
            console.warn(ex.message);
            if (options.verbose > 1) console.warn(ex.stack);
            if (options.context) {
                let path = options.context.pop();
                console.warn(path);
            }
            if (options.warnings) {
                for (let warning of options.warnings) {
                    if (argv.bae) {
                        const display = bae(options.schema,options.openapi,[warning]);
                        console.warn(display);
                    }
                    else {
                        console.warn(warning.message,warning.pointer);
                    }
                }
            }
            reject(ex);
        }
        if (result) {
            if (options.sourceYaml) {
                console.log(yaml.safeDump(options.openapi));
            }
            else {
                console.log(JSON.stringify(options.openapi,null,2));
            }
        }
        resolve(options.openapi);
    });
}

main()
.then(function(options){
    process.exitCode = 0;
})
.catch(function(err){
    console.warn(err.message);
});

