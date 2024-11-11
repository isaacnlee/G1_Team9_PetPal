// Simulating login check (replace this with actual logic to check if the user is logged in)
const isLoggedIn = false;


document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.protected-link').forEach(link => {
        link.addEventListener('click', function (event) {
            if (!isLoggedIn) {
                event.preventDefault();  // Prevent default navigation
                document.getElementById('authModal').style.display = 'flex'; // Show the modal
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    // Ensure the modal is hidden when the close button or backdrop is clicked
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));

    // Remove any leftover backdrop manually
    const closeModalBackdrop = () => {
        const modalBackdrop = document.querySelector('.modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.remove(); // Remove the backdrop manually
        }
        document.body.classList.remove('modal-open'); // Remove the 'modal-open' class from the body
        document.body.style.overflow = ''; // Reset body overflow
        document.body.style.paddingRight = ''; // Reset body padding
    };

    // Listen for modal close event
    document.getElementById('authModal').addEventListener('hidden.bs.modal', function () {
        closeModalBackdrop();
    });

    // Close the modal and remove the backdrop when the close button is clicked
    document.querySelector('.btn-close').addEventListener('click', function () {
        authModal.hide();
        closeModalBackdrop();
    });

});

