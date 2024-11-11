// Import the necessary Firebase modules
import { auth } from '../../../backend/firebase/firebaseConfig.js'; // Adjust the import path as necessary
import { signOut } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js"; // Import the signOut function

// Get the sign-out button element
const signOutButton = document.getElementById('signOutButton');

// Add click event listener to the sign-out button
signOutButton.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent the default anchor behavior

    signOut(auth).then(() => {
        // Sign-out successful.
        console.log('User signed out.');
        // Redirect to login or home page if needed
        window.location.href = '../Register/loggedOut.html'; // Redirect to loggedOut.html after sign out
    }).catch((error) => {
        // An error happened during sign out
        console.error('Sign-out error:', error);
    });
});
