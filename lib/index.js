var Path = require('path');
var YAML = require('js-yaml');
var CSON = require('cson');
var TOML = require('toml');

/**
 * Metalsmith plugin to load data content from folder and put it into the global metadata.
 * Currently supported data formats are JSON, YAML, CSON and TOML. And also JS (see below).
 * This plugin mainly based on https://github.com/segmentio/metalsmith-metadata 
 *
 * @param {Object} opts: path -- data folder
 *                       exclude -- delete parsed files from generated build
 *                       allowjs -- allow evaling js files
 * @return {Function}
 */

module.exports = function( opts ){
	opts = opts || {};

	var datapath = opts.path || "data";
	var exclude = opts.exclude || false;
	var allowjs = opts.allowjs || false;

	var DEFAULT_PARSERS = {
		'.json': JSON.parse,
		'.yaml': YAML.safeLoad,
		'.yml': YAML.safeLoad,
		'.cson': CSON.parse,
		'.toml': TOML.parse,
	};

	if ( allowjs ) {
		DEFAULT_PARSERS['.js'] = function(str) {
			return eval( str.toString()); 
		}
	}

	return function( files, metalsmith, done ) {
		var parsers = DEFAULT_PARSERS;
		var metadata = metalsmith.metadata();

		var datafiles = {};
		for ( var file in files ) {
			if ( Path.dirname(file) == datapath ) {
				datafiles[file] = files[file];
			}
		};

		for ( var file in datafiles ) {
			var datakey = Path.basename( file, Path.extname( file ));
			var ext = Path.extname( file );
			
			if ( !parsers[ext] ) {
				throw new Error( 'unsupported metadata type "' + ext + '"' );
			}
			
			if ( metadata[datakey] ) {
				throw new Error( 'metadata already contains key "' + datakey + '"' );
			}

			var splitted = Path.dirname( file ).split( Path.sep ).slice(1);
			var parse = parsers[ext];
			var str = files[file].contents.toString();
			
			if ( exclude ) {	
				delete files[file];
			}

			try {
				var data = parse( str );
			} catch (e) {
				return done( new Error( 'malformed data in "' + file + '"' ));
			}
				
			var adding = metadata;

			for ( key in splitted ) {
				adding[key] = metadata[key] || {};
				adding = adding[key];
			}
			adding[datakey] = data;
		}

		done();
	};
}
