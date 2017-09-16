let gulp = require('gulp'),

    data = require('gulp-data'),
    pug = require('gulp-pug');

gulp.task('pug', function () {

    //TODO generalize requires
    let impression = require('../src/_data/impressum.pug.json');
    let main = require('../src/_data/index.pug.json');

    let pugData = Object.assign(main, impression);

    return gulp.src('./src/*.pug')
        .pipe(data(function (file) {
            return pugData;
        }))
        .pipe(pug())
        .on('error', function (err) {
            process.stderr.write(err.message + '\n');
            this.emit('end');
        })

        .pipe(gulp.dest('./public/'));
});
