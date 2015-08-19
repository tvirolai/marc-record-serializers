'use strict';

module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			gruntfile: {
				src: 'Gruntfile.js'
			},
			lib: {
				src: ['lib/**/*.js']
			},
		 
		},

		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: [ 'test/**/*.spec.js' ]
			}
		},

		mocha_istanbul: {
           
            coveralls: {
                src: ['test'],
                options: {
                    coverage: true,
                    check: {
                        lines: 90,
                        statements: 90,
                        branches: 80,
                        functions: 90
                    }
                }
            }
        },

        watch: {
        	test: {
        		files: ['**/*.js'],
        		tasks: ['mochaTest']
        	}
        }


	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-mocha-istanbul');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('lint', ['jshint']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('coverage', ['mocha_istanbul']);

	grunt.registerTask('default', ['lint', 'test', 'coverage']);
};
