jQuery(document).ready(function ($) {
    var $body = $('body');

    $('.toggler').on('click', function (e) {
        e.preventDefault()
        $body.toggleClass('hide-menu');
        if ($body.hasClass("hide-menu")) {
            setCookie('hideNav', 'true');
        } else {
            setCookie('hideNav', 'false');
        }
    })

    $('[data-toggle="tooltip"]').tooltip()
    
});

