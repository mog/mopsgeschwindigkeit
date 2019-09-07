let gulp = require('gulp'),
    sassLint = require('gulp-sass-lint');

gulp.task('lint-sass', function () {

    return gulp.src('./src/sass/*.scss')
        .pipe(sassLint())
        .pipe(sassLint.format())
        .pipe(sassLint.failOnError())
});