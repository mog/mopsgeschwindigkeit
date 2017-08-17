let gulp = require('gulp'),
    gulpSequence = require('gulp-sequence');

require('require-dir')('./gulp_tasks');

gulp.task('default', ['clean', 'browser-sync', 'watch']);

gulp.task('build', gulpSequence('clean', ['copymanifest', 'copyassets', 'impression', 'sponsors', 'manifest'], ['pug', 'sass', 'browserify'], 'uglify', 'critical'));
