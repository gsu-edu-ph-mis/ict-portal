/**
 * Use moment functions in vue templates
 */

// Define a new component
if (typeof VueMixins === 'undefined') {
    function VueMixins() { } // Goes to window.VueMixins
}

/**
 * Usage:
 * mixins: [
 *      VueMixins
 * ],
 */
VueMixins = {
    // Same-name data are overwritten
    computed: {
        
    },
    data: function () {
       
    },
    filters: {
        // Usage: ${value|formatDate('YYYY-MM-DD hh:mm A')}
        formatDate: function(input, format){
            if(moment){
                return moment(input).format(format);
            }
            return input;
        },
        fromNow: function(input, opts){
            if(moment){
                return moment(input).fromNow(opts);
            }
            return input;
        },
    },
    methods: {
        // Usage: ${formatDate(value, 'YYYY-MM-DD hh:mm A')}
        formatDate: function(input, format){
            if(moment){
                return moment(input).format(format);
            }
            return input;
        },
        fromNow: function(input, opts){
            if(moment){
                return moment(input).fromNow(opts);
            }
            return input;
        },
    }
}

