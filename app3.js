$(document).ready(function(){
    $(window).scroll(function(){
        // sticky navbar on scroll script
        if(this.scrollY > 20){
            $('.navbar').addClass("sticky");
        }else{
            $('.navbar').removeClass("sticky");
        }
        
        // scroll-up button show/hide script
        if(this.scrollY > 500){
            $('.scroll-up-btn').addClass("show");
        }else{
            $('.scroll-up-btn').removeClass("show");
        }
    });

    // slide-up script
    $('.scroll-up-btn').click(function(){
        $('html').animate({scrollTop: 0});
        // removing smooth scroll on slide-up button click
        $('html').css("scrollBehavior", "auto");
    });

    $('.navbar .menu li a').click(function(){
        // applying again smooth scroll on menu items click
        $('html').css("scrollBehavior", "smooth");
        // close menu on item click
        $('.navbar .menu').removeClass("active");
        $('.menu-btn i').removeClass("active");
    });

    // toggle menu/navbar script
    $('.menu-btn').click(function(){
        $('.navbar .menu').toggleClass("active");
        $('.menu-btn i').toggleClass("active");
    });

    // typing text animation script
    var typed = new Typed(".typing", {
        strings: ["Management","Technical","Graphic Designing","Content Creation","Web Development", "Membership Relations","Outreach"],
        typeSpeed: 100,
        backSpeed: 60,
        loop: true
    });
    var typed = new Typed(".typing-3", {
        strings: ["Connect with us on :)"],
        typeSpeed: 100,
        backSpeed: 60,
        loop: true
    });

    var typed = new Typed(".typing-2", {
        strings: ["Soft","Computing" ,"Research", "Society", "KARE"],
        typeSpeed: 100,
        backSpeed: 60,
        loop: true
    });

    // owl carousel script
    $('.carousel').owlCarousel({
        margin: 20,
        loop: true,
        autoplay: true,
        autoplayTimeout: 7000, // Changed from 3000 to 7000 for slower scroll
        autoplayHoverPause: true,
        responsive: {
            0:{
                items: 1,
                nav: false
            },
            600:{
                items: 1, 
                nav: false
            },
            1000:{
                items: 1, 
                nav: false
            }
        }
    });

    // Show More/Less button for registration table
    const rowsToShow = 5;
    const tableRows = $('.registration-table tbody tr');
    tableRows.slice(rowsToShow).hide();

    if (tableRows.length > rowsToShow) {
        $('#showMoreBtn').show();
    } else {
        $('#showMoreBtn').hide();
    }

    $('#showMoreBtn').on('click', function() {
        const hiddenRows = tableRows.slice(rowsToShow);
        if (hiddenRows.is(':hidden')) {
            hiddenRows.show();
            $(this).text('Show Less');
        } else {
            hiddenRows.hide();
            $(this).text('Show More');
        }
    });

    // --- NEW SCRIPT FOR IMAGE MODAL ---
    const modal = $('#imageModal');
    const modalImg = $('#modalImage');

    // Add click listener to all images with the class 'team-member-img'
    $('.team-member-img').on('click', function(){
        modal.show();
        modalImg.attr('src', $(this).attr('src'));
    });

    // Get the <span> element that closes the modal
    const span = $('.close-modal');

    // When the user clicks on <span> (x), close the modal
    span.on('click', function() {
        modal.hide();
    });

    // When the user clicks anywhere outside of the modal content, close it
    $(window).on('click', function(event) {
        if (event.target == modal[0]) {
            modal.hide();
        }
    });
});