/*
 * grunt-remove-duplicates
 * https://github.com/komlev/grunt-remove-duplicates
 *
 * Copyright (c) 2014 komlev
 * Licensed under the MIT license.
 */
'use strict';

var through = require('through2')
    , rs = require('replacestream')
    , gutil = require('gulp-util')
    , extend = require('extend')
    , _ = require('lodash');

var defaultOptions = {
    keepLast: false
};

var removeDups = function(content, options) {
    var match,
        dup,
        tmp,
        ind,
        map={},
        scriptDups = [],
        styleDups = [],
        scriptSrc=[],
        styleSrc=[],
        scriptRegExp = /\s*<script[^>]+src="?([^"\s]+)"?\s*>\s*<\/script>/gm,
        styleRegExp = /\s*<link[^>]+href="?([^"\s]+)"?.*\/?>/gm;

    match = undefined;
    while (match = scriptRegExp.exec(content)) {
        scriptSrc.push(match[1]);
    }

    while (match = styleRegExp.exec(content)) {
        styleSrc.push(match[1]);
    }

    _.each(scriptSrc, function(item) {
        if (map[item] !== undefined) {
            map[item] = map[item] + 1;
            if (scriptDups.indexOf(item) === -1) {
                scriptDups.push(item);
            }
        } else {
            map[item] = 0;
        }
    });

    _.each(styleSrc, function(item) {
        if (map[item] !== undefined) {
            map[item] = map[item] + 1;
            if (styleDups.indexOf(item) === -1) {
                styleDups.push(item);
            }
        } else {
            map[item] = 0;
        }
    });

    for (var i = 0; i < scriptDups.length; i++) {
        dup = scriptDups[i];
        tmp = 'REMOVE_DUPLICATES_PLACEHOLDER_' + i;

        if (!dup)
            continue;

        if (options.keepLast) {
            ind = content.lastIndexOf(dup);
            content = content.substr(0, ind) + tmp + content.substr(ind + dup.length);
        } else {
            content = content.replace(dup, tmp);
        }
        scriptRegExp = new RegExp('\\s*<script[^>]+src="' + dup + '"?\\s*>\\s*<\/script>', 'gm');
        content = content.replace(scriptRegExp, '');
        content = content.replace(tmp, dup);
    }

    for (var i = 0; i < styleDups.length; i++) {
        dup = styleDups[i];
        tmp = 'REMOVE_DUPLICATES_PLACEHOLDER_' + i;

        if (!dup)
            continue;
        if (options.keepLast) {
            ind = content.lastIndexOf(dup);
            content = content.substr(0, ind) + tmp + content.substr(ind + dup.length);
        } else {
            content = content.replace(dup, tmp);
        }
        styleRegExp = new RegExp('\\s*<link[^>]+href="' + dup + '".*\/?>', 'gm');
        content = content.replace(styleRegExp, '');
        content = content.replace(tmp, dup);
    }

    return content;
};

module.exports = function (userOptions) {
    var options = extend(true, {}, defaultOptions, userOptions);

    return through.obj(function (file, enc, callback) {

        gutil.log("meep");

        if (file.isStream()) {
            gutil.log("isStream");
            file.contents = file.contents.pipe(rs(search, replacement));
            return callback(null, file);
        }

        if (file.isBuffer()) {
            gutil.log("isBuffer");
            try {
                var contents = String(file.contents);
                contents = removeDups(contents, options);

                file.contents = new Buffer(contents);
            } catch (e) {
                return callback(new gutil.PluginError('gulp-remove-duplicates', e));
            }
        }

        callback(null, file);
    });
};