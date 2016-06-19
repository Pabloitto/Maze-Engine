var gulp = require("gulp");
var gutil = require("gulp-util");
var source = require("vinyl-source-stream");
var browserify = require("browserify");
var watchify = require("watchify");

gulp.task("default", function () {

    var bundler = watchify(browserify({
        entries: ['./client/app/app.js'],
        extensions: ['.js'],
        debug: true,
        packageCache: {},
        fullPaths: true
    }));


    function build(file) {
        gutil.log(file);
        if (file) {
            gutil.log("Recompiling " + file);
        }

        return bundler.bundle()
					  .on('error', gutil.log.bind(gutil, "browserify error"))
					  .pipe(source('main.js'))
					  .pipe(gulp.dest('./client/app/'));
    };

    build();
    bundler.on('update', build);
});