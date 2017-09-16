let gulp = require('gulp'),

    through = require('through2'),
    browserify = require('gulp-browserify'),
    uglify = require('uglify-es'),
    gutil = require('gulp-util');

gulp.task('browserify', function () {
    return gulp.src('./src/_scripts/*.js')
        .pipe(browserify({
            bare: true
        }))
        .on('error', function (err) {
            process.stderr.write(err.message + '\n');
            this.emit('end');
        })
        .pipe(gulp.dest('./public/js/'));
});

gulp.task('uglify', ['browserify'], function () {
    return gulp.src('./public/js/*.js')
        .pipe(
            through.obj((file, enc, cb) => {
                var minres = uglify.minify(file.contents.toString());
                if (minres.error) {
                    process.stderr.write(
                        minres.error.message +
                        ' in ' +
                        minres.error.filename +
                        ':' +
                        minres.error.line +
                        ' ' +
                        minres.error.col +
                        ':' +
                        minres.error.pos +
                        '\n'
                    );
                } else {
                    var olength = file.contents.byteLength;
                    file.contents = Buffer.from(minres.code);
                    gutil.log(
                        `Compressed ${file.path.split('/').pop()}`,
                        gutil.colors.gray(`(saved ${olength - file.contents.byteLength} bytes - ${(100 - (file.contents.byteLength / olength) * 100).toFixed(2)}%)`)
                    );
                }
                cb(null, file);
            })
        )
        .on('error', function (err) {
            process.stderr.write(err.message + '\n');
            this.emit('end');
        })
        .pipe(gulp.dest('./public/js/'));
});