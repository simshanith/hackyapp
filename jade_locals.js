var _ = require('lodash/dist/lodash.underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());

_.mixin({
	chunk: function(arr, chunkSize){
		// works with Objects (chunks values)
		// works with Strings
		// works with things that have array representations
		if(!_.toArray(arr).length)
			return;

		if(!_.isArray(arr))
			arr = _.toArray(arr);

		/* Adapted from http://stackoverflow.com/questions/8495687/split-array-into-chunks/10456644#10456644 */
		return [].concat.apply([],
			arr.map(function(elem,i) {
				return i%chunkSize ? [] : [arr.slice(i,i+chunkSize)];
        }));
	}
});

// Declare helper functions.
function joinClasses(arr){
	if(!_.isArray(arr)) return;
	arr = _.filter(_.compact(_.uniq(arr)), _.isString);
	return arr.join(' ');
}

function cssFromPairs(arr) {
	var rules = _.map(arr, function(pair) {return pair.join(': ');});
	_.each(rules, console.log);
	var string = rules.join('; ') + ';';
	return string;
}

// Wrap public properties in object
var jadeLocals = {
    joinClasses: joinClasses,
    cssFromPairs: cssFromPairs,
    _: _
};

// Export.
_.extend(module.exports, jadeLocals);