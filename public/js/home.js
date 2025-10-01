// src/public/js/home.js
document.addEventListener('DOMContentLoaded', function () {
    if (window.innerWidth <= 768) {
        const toggleButtons = document.querySelectorAll('.category-toggle');

        toggleButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const categoryGroup = this.closest('.category-group');
                categoryGroup.classList.toggle('active');
            });
        });
    }
});