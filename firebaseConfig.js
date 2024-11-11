// Imports the necessary Firebase functions, including authentication functions 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

// Fill in with your own web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCNhykel9ZESR6bwbWfom01Ku8JKw1O_F4",
    authDomain: "petpal-10563.firebaseapp.com",
    projectId: "petpal-10563",
    storageBucket: "petpal-10563.appspot.com",
    messagingSenderId: "471578757310",
    appId: "1:471578757310:web:631572ad445ff2268c76ef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase services (important line as it allows other pages to use firebaseConfig.js code)
export { db, auth, storage };

// Set up the authentication state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        window.currentUserUID = user.uid;
    } else {
        console.log('No user is signed in.');
        window.currentUserUID = null;
    }
});

// LOGOUT Functionality
// Function to handle logout
function handleLogout() {
    signOut(auth)
        .then(() => {
            console.log('User signed out successfully.');
            window.location.href = 'signOut.html'; // Use relative path to redirect
        })
        .catch((error) => {
            console.error('Error signing out:', error);
            alert('Error logging out. Please try again.');
        });
}

// Attach the sign out functionality to the button with ID 'signOutButton'
document.addEventListener('DOMContentLoaded', () => {
    const signOutButton = document.getElementById('signOutButton');

    if (signOutButton) {
        signOutButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the default link behavior
            handleLogout(); // Call the logout function
        });
    }
});
