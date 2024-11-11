// Initialize Firebase Authentication
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { db, auth } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async(e)=> {
    e.preventDefault();
    const email = document.querySelector('input[type="email"]').value;
    const password = document.querySelector('input[type="password"]').value;
    const confirmPassword = document.querySelector('input[placeholder="Re-enter Password"]').value;
    const username = document.querySelector('input[type="text"]').value;

    // Check for empty fields and password match
    if (username === '' || email === '' || password === '' || confirmPassword === '') {
        alert('Please fill in all fields.');
        return;
    }

    else if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    else {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
         
            //Adding user details to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                username: username,
                username_lower: username.toLowerCase(),
                email: email,
                createdAt: new Date(),
            });
            
            window.location.href = "success.html";
    
            // In firebase authentication, the user gets logged in immediately
            // after registering, the below lines are meant to prevent that
            // and take the user back to login page after registering.
            await signOut(auth);
        } catch(error) {
            alert(error.message);
        }
    } 
});


