let gulp = require('gulp'),

    fs = require('fs'),
    rename = require("gulp-rename"),

    imageResize = require('gulp-image-resize'),
    imagemin = require('gulp-imagemin'),
    gm = require('gulp-gm');

gulp.task('copyassets', function () {
    gulp.src(['./src/_assets/**/*', '!./src/_assets/**/imp*.*', '!./src/_assets/**/sponsor_*.*', '!./src/_assets/**/logo--manifest*.*'])
        .pipe(imagemin())
        .pipe(gulp.dest('./public/assets/'));
});

gulp.task('impression', function () {
    var dataJSON = JSON.parse(fs.readFileSync('./src/_data/index.pug.json'));

    dataJSON.impressions.slider.sizes.map((size) => {
        gulp.src('./src/_assets/**/imp*.*')
            .pipe(imageResize({
                width: size.width,
                filter: 'catrom',
                upscale: false
            }))
            .pipe(rename(function (path) {
                path.basename += size.suffix;
            }))
            .pipe(imagemin())
            .pipe(gulp.dest('./public/assets/'));
    });
});

gulp.task('sponsors', function () {
    var dataJSON = JSON.parse(fs.readFileSync('./src/_data/index.pug.json'));

    dataJSON.sponsors.sizes.map((size) => {
        gulp.src('./src/_assets/**/sponsor_*.*')
            .pipe(gm(function (gmfile) {
                //modulate(255,255,255)
                return gmfile./*blackThreshold(255,255,255)*/modulate(0, 0, 0).colorize(7, 21, 50);
            }))
            .pipe(imageResize({
                height: size.height,
                width: size.width,
                filter: 'catrom',
                upscale: false
            }))
            .pipe(rename(function (path) {
                path.basename += size.suffix;
            }))
            .pipe(imagemin())
            .pipe(gulp.dest('./public/assets/'));
    });
});
